"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Schema = mongoose_1.default.Schema;
const ObjectId = Schema.Types.ObjectId;
const PhoneSchema = new Schema({
    // 区号
    area_code: { type: String },
    // 手机号码
    phone: { type: String, unique: true },
    // 对应的用户信息
    user_id: { type: ObjectId, ref: 'User', unique: true },
    // 创建日期
    create_at: { type: Date, default: Date.now },
    // 删除状态
    deleted: { type: Boolean, default: false }
});
PhoneSchema.index({ phone: 1 });
PhoneSchema.index({ user_id: 1 });
PhoneSchema.index({ phone: 1, user_id: 1 }, { unique: true });
mongoose_1.default.model('Phone', PhoneSchema);
