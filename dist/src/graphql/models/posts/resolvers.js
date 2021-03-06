"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../../../models");
const config_1 = __importDefault(require("../../../../config"));
const { debug } = config_1.default;
const errors_1 = __importDefault(require("../../common/errors"));
const to_1 = __importDefault(require("../../../utils/to"));
const xss_1 = __importDefault(require("xss"));
const Model = __importStar(require("./arguments"));
const tools_1 = require("../tools");
const socket_1 = require("../../../socket");
// 查询
const posts = (root, args, context, schema) => __awaiter(void 0, void 0, void 0, function* () {
    const { user, role } = context;
    const { method } = args;
    let select = {}, err, postList, query, options;
    [err, query] = tools_1.getQuery({ args, model: Model.posts, role });
    [err, options] = tools_1.getOption({ args, model: Model.posts, role });
    // 未登陆用户，不能使用method方式查询
    if (!user && method)
        throw errors_1.default({ message: '请求被拒绝' });
    // 每页数量
    let limit = options.limit;
    // select
    schema.fieldNodes[0].selectionSet.selections.map((item) => select[item.name.value] = 1);
    // 用户隐私信息，仅对管理员可以返回
    if (!role || role != 'admin') {
        if (select.ip)
            delete select.ip;
    }
    // 增加屏蔽条件
    // 1、如果是登陆状态，那么增加屏蔽条件
    // 2、如果通过posts id查询，那么不增加屏蔽条件
    if (user) {
        if (!query._id && user.block_posts_count > 0) {
            query._id = { '$nin': user.block_posts };
        }
        if (!query.user_id && user.block_people_count > 0) {
            query.user_id = { '$nin': user.block_people };
        }
    }
    // 收藏
    if (user && method == 'subscribe' || user && method == 'favorite') {
        if (user.follow_posts.length == 0 && user.block_posts.length == 0)
            return [];
        query._id = {
            '$in': user.follow_posts,
            // 过滤屏蔽的帖子
            '$nin': user.block_posts
        };
    }
    if (!options.populate)
        options.populate = [];
    if (select.user_id) {
        options.populate.push({
            path: 'user_id',
            justOne: true
        });
    }
    if (select.comment) {
        options.populate.push({
            path: 'comment',
            match: {
                deleted: false,
                weaken: false
            },
            select: {
                '_id': 1, 'content_html': 1, 'create_at': 1, 'reply_count': 1,
                'like_count': 1, 'user_id': 1, 'posts_id': 1
            },
            options: { limit: 5, sort: { create_at: -1 } }
        });
    }
    if (select.topic_id) {
        options.populate.push({
            path: 'topic_id',
            select: { '_id': 1, 'name': 1, 'avatar': 1 },
            justOne: true
        });
    }
    if (query['$or'] && query['$or'].length == 0) {
        postList = [];
    }
    else {
        [err, postList = []] = yield to_1.default(models_1.Posts.find({ query, select, options }));
    }
    if (err) {
        throw errors_1.default({
            message: '查询失败',
            data: { errorInfo: err.message }
        });
    }
    if (select.comment && postList.length > 0) {
        options = [
            {
                path: 'comment.user_id',
                model: 'User',
                select: { '_id': 1, 'avatar': 1, 'nickname': 1, 'brief': 1 },
                justOne: true
            }
        ];
        [err, postList] = yield to_1.default(models_1.Posts.populate({ collections: postList, options }));
        if (err) {
            throw errors_1.default({
                message: '查询失败',
                data: { errorInfo: err.message }
            });
        }
    }
    // 如果未登陆，直接返回
    if (!user || postList.length == 0)
        return postList;
    let peopleIds = [], postsIds = [];
    postList.map((item) => {
        postsIds.push(item._id);
        if (!item.user_id || !item.user_id._id)
            return;
        if (peopleIds.indexOf(item.user_id._id) == -1) {
            peopleIds.push(item.user_id._id);
        }
    });
    let promises = [
        // 关注用户
        models_1.Follow.find({
            query: { user_id: user._id, people_id: { "$in": peopleIds }, deleted: false },
            select: { _id: 0, people_id: 1 }
        }),
        // 关注帖子
        models_1.Follow.find({
            query: { user_id: user._id, posts_id: { "$in": postsIds }, deleted: false },
            select: { _id: 0, posts_id: 1 }
        }),
        // 赞的帖子
        models_1.Like.find({
            query: { user_id: user._id, type: 'posts', target_id: { "$in": postsIds }, deleted: false },
            select: { _id: 0, target_id: 1 }
        })
    ];
    if (method == 'user_follow' && limit != 1) {
        promises.push(models_1.User.update({
            query: { _id: user._id },
            update: { last_find_posts_at: new Date() }
        }));
    }
    else if (method == 'subscribe' && limit != 1 || method == 'favorite' && limit != 1) {
        promises.push(models_1.User.update({
            query: { _id: user._id },
            update: { last_find_subscribe_at: new Date() }
        }));
    }
    else if (query.recommend && limit != 1) {
        promises.push(models_1.User.update({
            query: { _id: user._id },
            update: { last_find_excellent_at: new Date() }
        }));
    }
    return Promise.all(promises).then(([followPeopleList, followPostsList, likePostsList]) => {
        let ids = {};
        followPeopleList.map((item) => { ids[item.people_id] = 1; });
        followPeopleList = ids;
        ids = {};
        followPostsList.map((item) => { ids[item.posts_id] = 1; });
        followPostsList = ids;
        ids = {};
        likePostsList.map((item) => { ids[item.target_id] = 1; });
        likePostsList = ids;
        postList.map((item) => {
            item.follow = followPostsList[item._id] ? true : false;
            item.like = likePostsList[item._id] ? true : false;
            if (item.user_id) {
                item.user_id.follow = followPeopleList[item.user_id._id] ? true : false;
            }
        });
        return postList;
    });
});
// 获取累计数
const countPosts = (root, args, context, schema) => __awaiter(void 0, void 0, void 0, function* () {
    const { user, role } = context;
    const { method } = args;
    let [select, err, count, query] = [{}, null, null, null];
    [err, query] = tools_1.getQuery({ args, model: Model.posts, role });
    if (err) {
        throw errors_1.default({ message: err });
    }
    // 未登陆用户，不能使用method方式查询
    if (!user && method) {
        throw errors_1.default({ message: '请求被拒绝' });
    }
    // select
    schema.fieldNodes[0].selectionSet.selections.map((item) => select[item.name.value] = 1);
    // 增加屏蔽条件
    // 1、如果是登陆状态，那么增加屏蔽条件
    // 2、如果通过posts id查询，那么不增加屏蔽条件
    if (user) {
        if (!query._id && user.block_posts_count > 0) {
            query._id = { '$nin': user.block_posts };
        }
        if (!query.user_id && user.block_people_count > 0) {
            query.user_id = { '$nin': user.block_people };
        }
    }
    // 收藏
    if (user && method == 'subscribe' || user && method == 'favorite') {
        if (user.follow_posts.length == 0 && user.block_posts.length == 0)
            return [];
        query._id = {
            '$in': user.follow_posts,
            // 过滤屏蔽的帖子
            '$nin': user.block_posts
        };
    }
    [err, count] = yield to_1.default(models_1.Posts.count({ query }));
    if (err) {
        throw errors_1.default({
            message: '查询失败',
            data: { errorInfo: err.message }
        });
    }
    return {
        count
    };
});
function Countdown(nowDate, endDate) {
    var lastDate = Math.ceil(new Date(endDate).getTime() / 1000);
    var now = Math.ceil(new Date(nowDate).getTime() / 1000);
    var timeCount = lastDate - now;
    var days = parseInt((timeCount / (3600 * 24)) + '');
    var hours = parseInt(((timeCount - (3600 * 24 * days)) / 3600) + '');
    var mintues = parseInt(((timeCount - (3600 * 24 * days) - (hours * 3600)) / 60) + '');
    var seconds = timeCount - (3600 * 24 * days) - (3600 * hours) - (60 * mintues);
    return {
        days: days,
        hours: hours,
        mintues: mintues,
        seconds: seconds
    };
}
const addPosts = (root, args, context, schema) => __awaiter(void 0, void 0, void 0, function* () {
    const { user, role, ip } = context;
    let err, // 错误
    result, // 结果
    fields; // 字段
    if (!user)
        throw errors_1.default({ message: '请求被拒绝' });
    // [ err, fields ] = getSaveFields({ args, model:'posts', role });
    [err, fields] = tools_1.getSave({ args, model: Model.addPosts, role });
    if (err)
        throw errors_1.default({ message: err });
    // 开始逻辑
    let { title, content, content_html, topic_id, device_id = 1, type = 1 } = fields;
    if (!ip)
        throw errors_1.default({ message: '无效的ip' });
    if (type > 1)
        throw errors_1.default({ message: 'type 无效' });
    // 判断是否禁言
    if (user && user.banned_to_post &&
        new Date(user.banned_to_post).getTime() > new Date().getTime()) {
        let countdown = Countdown(new Date() + '', user.banned_to_post);
        throw errors_1.default({
            message: '您被禁言，{days}天{hours}小时{mintues}分钟后解除禁言',
            data: { error_data: countdown }
        });
    }
    if (!debug) {
        // phone
        [err, result] = yield to_1.default(models_1.Phone.findOne({
            query: { user_id: user._id }
        }));
        if (!result) {
            // 一天仅能发布一次
            let date = new Date();
            [err, result] = yield to_1.default(models_1.Posts.findOne({
                query: {
                    user_id: user._id,
                    create_at: {
                        '$gte': new Date(date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate())
                    }
                }
            }));
            if (err) {
                throw errors_1.default({
                    message: '添加失败',
                    data: { errorInfo: err.message }
                });
            }
            if (result) {
                throw errors_1.default({
                    message: '一天仅能发布一次帖子，绑定手机号后解除限制'
                });
            }
        }
    }
    // title
    title = xss_1.default(title, {
        whiteList: {},
        stripIgnoreTag: true,
        onTagAttr: (tag, name, value, isWhiteAttr) => ''
    });
    if (!title || title.replace(/(^\s*)|(\s*$)/g, "") == '') {
        throw errors_1.default({ message: '标题不能为空' });
    }
    else if (title.length > 120) {
        throw errors_1.default({ message: '标题不能大于120个字符' });
    }
    // content
    // content = xss(content, {
    //   whiteList: {},
    //   stripIgnoreTag: true,
    //   onTagAttr: (tag, name, value, isWhiteAttr) => ''
    // });
    content_html = xss_1.default(content_html, {
        whiteList: {
            a: ['href', 'title', 'target', 'rel'],
            img: ['src', 'alt'],
            p: [], div: [], br: [], blockquote: [], li: [], ol: [], ul: [],
            strong: [], em: [], u: [], pre: [], b: [], h1: [], h2: [], h3: [],
            h4: [], h5: [], h6: [], h7: [], video: []
        },
        stripIgnoreTag: true,
        onIgnoreTagAttr: function (tag, name, value, isWhiteAttr) {
            if (tag == 'div' && name.substr(0, 5) === 'data-') {
                // 通过内置的escapeAttrValue函数来对属性值进行转义
                return name + '="' + xss_1.default.escapeAttrValue(value) + '"';
            }
        }
    });
    // topic
    [err, result] = yield to_1.default(models_1.Topic.findOne({
        query: { _id: topic_id }
    }));
    if (err) {
        throw errors_1.default({
            message: '查询失败',
            data: { errorInfo: err.message }
        });
    }
    if (!result) {
        throw errors_1.default({
            message: 'topic_id 不存在'
        });
    }
    // 储存
    [err, result] = yield to_1.default(models_1.Posts.save({
        data: {
            user_id: user._id,
            title,
            content,
            content_html,
            topic_id,
            ip,
            device: device_id,
            type,
            last_comment_at: new Date().getTime()
        }
    }));
    // 添加到feed
    models_1.Feed.save({
        data: {
            user_id: user._id,
            posts_id: result._id
        }
    });
    // 更新
    yield to_1.default(models_1.Topic.update({
        query: { _id: topic_id },
        update: { $inc: { 'posts_count': 1 } }
    }));
    yield to_1.default(models_1.User.update({
        query: { _id: user._id },
        update: { $inc: { 'posts_count': 1 } }
    }));
    if (err) {
        throw errors_1.default({
            message: '储存失败',
            data: { errorInfo: err.message }
        });
    }
    return {
        success: true,
        _id: result._id
    };
});
// 更新
const updatePosts = (root, args, context, schema) => __awaiter(void 0, void 0, void 0, function* () {
    const { user, role } = context;
    // 必须登陆用户才有权限
    if (!user)
        throw errors_1.default({ message: '请求被拒绝' });
    let [err, query, content, result] = [];
    // 获取查询条件
    [err, query] = tools_1.getQuery({ args, model: Model.updatePosts, role });
    if (err)
        throw errors_1.default({ message: err });
    // 获取更新内容
    [err, content] = tools_1.getSave({ args, model: Model.updatePosts, role });
    if (err)
        throw errors_1.default({ message: err });
    // 判断帖子是否存在
    [err, result] = yield to_1.default(models_1.Posts.findOne({ query }));
    if (err) {
        throw errors_1.default({
            message: '查询失败',
            data: { errorInfo: err.message }
        });
    }
    if (!result)
        throw errors_1.default({ message: '帖子不存在' });
    // 是否有权限修改
    if (role != 'admin' && user._id + '' != result.user_id + '') {
        throw errors_1.default({ message: '无权修改' });
    }
    if (role != 'admin') {
        // 帖子超过48小时，则不能被修改
        if (new Date().getTime() - new Date(result.create_at).getTime() > 1000 * 60 * 60 * 24) {
            throw errors_1.default({ message: '帖子超过24小时后，不能被修改' });
        }
    }
    content.update_at = new Date();
    // 更新
    [err, result] = yield to_1.default(models_1.Posts.update({ query, update: content }));
    if (err) {
        throw errors_1.default({
            message: '更新失败',
            data: { errorInfo: err.message }
        });
    }
    if (Reflect.has(content, 'deleted')) {
        // 更新feed中相关posts的delete状态
        let err, feedList;
        [err, feedList] = yield to_1.default(models_1.Feed.find({
            query: { posts_id: query._id }
        }));
        let ids = [];
        feedList.map((feed) => ids.push(feed._id));
        [err] = yield to_1.default(models_1.Feed.update({
            query: { _id: { '$in': ids } },
            update: { deleted: content.deleted },
            options: { multi: true }
        }));
        if (err) {
            throw errors_1.default({
                message: 'Feed 更新失败',
                data: { errorInfo: err.message }
            });
        }
    }
    if (Reflect.has(content, 'recommend')) {
        socket_1.emit('member', { type: 'recommend-posts' });
    }
    return { success: true };
});
const viewPosts = (root, args, context, schema) => __awaiter(void 0, void 0, void 0, function* () {
    const { posts_id } = args;
    let query = { _id: posts_id };
    let [err] = yield to_1.default(models_1.Posts.update({
        query,
        update: { $inc: { view_count: 1 } }
    }));
    if (err) {
        throw errors_1.default({
            message: '更新失败',
            data: { errorInfo: err.message }
        });
    }
    return {
        success: true
    };
});
exports.query = { posts, countPosts };
exports.mutation = { addPosts, updatePosts, viewPosts };
