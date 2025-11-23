import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import md5 from "spark-md5";

import { getServerSideConfig } from "../../config/server";

const DATA_DIR = "/app/data";
const MESSAGE_FILE = path.join(DATA_DIR, "leon-messages.json");

type LeaveMessagePayload = {
  code?: string;
  nickname?: string;
  content?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LeaveMessagePayload;
    const serverConfig = getServerSideConfig();

    const code = body.code?.trim() ?? "";
    const nickname = body.nickname?.trim() ?? "";
    const content = body.content?.trim() ?? "";

    const hashed = md5.hash(code);
    const authorized = serverConfig.codes.has(hashed);

    if (!authorized) {
      return NextResponse.json(
        { success: false, message: "❌ 密码错误，请重试。" },
        { status: 401 },
      );
    }

    if (!nickname || !content) {
      return NextResponse.json(
        { success: false, message: "请填写昵称和留言内容哦～" },
        { status: 400 },
      );
    }

    await fs.mkdir(DATA_DIR, { recursive: true });

    let messages: Array<{
      nickname: string;
      content: string;
      createdAt: string;
    }> = [];

    try {
      const raw = await fs.readFile(MESSAGE_FILE, "utf-8");
      messages = JSON.parse(raw);
      if (!Array.isArray(messages)) {
        messages = [];
      }
    } catch (err) {
      // 文件不存在或解析失败时重新开始
      messages = [];
    }

    const entry = {
      nickname,
      content,
      createdAt: new Date().toISOString(),
    };

    messages.push(entry);

    await fs.writeFile(MESSAGE_FILE, JSON.stringify(messages, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      message: "留言已保存，感谢你的支持！",
    });
  } catch (error) {
    console.error("[LeaveMessage] failed to save message", error);
    return NextResponse.json(
      { success: false, message: "服务器开小差了，请稍后再试。" },
      { status: 500 },
    );
  }
}
