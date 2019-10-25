"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Schema = mongoose_1.default.Schema;
const ObjectId = Schema.Types.ObjectId;
const SessionSchema = new Schema({
    // 发件人
    user_id: { type: ObjectId, ref: 'User' },
    // 接收人
    addressee_id: { type: ObjectId, ref: 'User' },
    // 最近一条消息
    last_message: { type: ObjectId, ref: 'Message' },
    // 未读数
    unread_count: { type: Number, default: 0 },
    // 创建日期
    create_at: { type: Date, default: Date.now },
    // 会话置顶
    top_at: { type: Date }
    // 回话更新日期
    // last_count_at: { type: Date, default: Date.now }
});
SessionSchema.index({ user_id: 1, addressee_id: 1 }, { unique: true });
mongoose_1.default.model('Session', SessionSchema);
