import { NextRequest, NextResponse } from "next/server";
import md5 from "spark-md5";
import { getServerSideConfig } from "../../config/server";

export async function POST(req: NextRequest) {
  const { code } = await req.json();

  // 读取服务器环境变量
  const serverConfig = getServerSideConfig();
  const hashed = md5.hash(code.trim());

  const success = serverConfig.codes.has(hashed);

  return NextResponse.json({
    success,
    message: success ? "✅ 验证成功" : "❌ 密码错误",
  });
}
