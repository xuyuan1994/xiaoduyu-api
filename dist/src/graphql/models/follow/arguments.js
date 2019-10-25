"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const ParseParams = __importStar(require("../../common/parse-params"));
// 查询
exports.findFollows = {
    user_id: (data) => ({
        typename: 'query',
        name: 'user_id',
        value: ParseParams.id(data),
        type: 'String',
        desc: '用户ID：id、ids、exists、not-exists'
    }),
    topic_id: (data) => ({
        typename: 'query',
        name: 'topic_id',
        value: ParseParams.id(data),
        type: 'String',
        desc: '话题ID：id、ids、exists、not-exists'
    }),
    posts_id: (data) => ({
        typename: 'query',
        name: 'posts_id',
        value: ParseParams.id(data),
        type: 'String',
        desc: '帖子ID：id、ids、exists、not-exists'
    }),
    people_id: (data) => ({
        typename: 'query',
        name: 'people_id',
        value: ParseParams.id(data),
        type: 'String',
        desc: '用户ID：id、ids、exists、not-exists'
    }),
    // 因为int类型长度大于11位，graphql 会认为格式不是int
    start_create_at: (data) => ({
        typename: 'query',
        name: 'create_at',
        value: { '$gte': data },
        type: 'String',
        desc: '开始日期'
    }),
    end_create_at: (data) => ({
        typename: 'query',
        name: 'create_at',
        value: { '$lte': data },
        type: 'String',
        desc: '结束日期'
    }),
    deleted: (data) => ({
        typename: 'query',
        name: 'deleted',
        value: data,
        type: 'Boolean',
        desc: '删除'
    }),
    page_number: (data) => ({
        typename: 'option',
        name: 'skip',
        value: data - 1 >= 0 ? data - 1 : 0,
        type: 'Int',
        desc: '第几页'
    }),
    page_size: (data) => ({
        typename: 'option',
        name: 'limit',
        value: data,
        type: 'Int',
        desc: '每页数量'
    }),
    sort_by: (data) => ({
        typename: 'option',
        name: 'sort',
        value: ParseParams.sortBy(data),
        type: 'String',
        desc: '排序方式例如: create_at:1，排序字段: create_at'
    })
};
// 储存
exports.addFollow = {
    topic_id: (data) => ({
        typename: 'save',
        name: 'topic_id',
        value: data,
        type: 'String',
        desc: '话题ID'
    }),
    posts_id: (data) => ({
        typename: 'save',
        name: 'posts_id',
        value: data,
        type: 'String',
        desc: '帖子ID'
    }),
    user_id: (data) => ({
        typename: 'save',
        name: 'user_id',
        value: data,
        type: 'String',
        desc: '用户ID'
    }),
    status: (data) => ({
        typename: 'save',
        name: 'status',
        value: data,
        type: 'Boolean',
        desc: '关注状态'
    })
};
