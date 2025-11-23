import { useEffect, useMemo, useRef, useState } from "react";

import styles from "./home.module.scss";

import { IconButton } from "./button";
import SettingsIcon from "../icons/settings.svg";
import ChatGptIcon from "../icons/chatgpt.svg";
import AddIcon from "../icons/add.svg";
import CloseIcon from "../icons/close.svg";
import DeleteIcon from "../icons/delete.svg";
import MaskIcon from "../icons/mask.svg";
import PluginIcon from "../icons/plugin.svg";
import DragIcon from "../icons/drag.svg";
import ConfirmIcon from "../icons/confirm.svg";
import CancelIcon from "../icons/cancel.svg";

import Locale from "../locales";

import { useAppConfig, useChatStore } from "../store";

import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  NARROW_SIDEBAR_WIDTH,
  Path,
} from "../constant";

import { Link, useNavigate } from "react-router-dom";
import { isIOS, useMobileScreen } from "../utils";
import dynamic from "next/dynamic";
import { Modal, showConfirm, showPasswordPrompt, showToast } from "./ui-lib";
import { createRoot } from "react-dom/client";

const ChatList = dynamic(async () => (await import("./chat-list")).ChatList, {
  loading: () => null,
});

function useHotKey() {
  const chatStore = useChatStore();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey) {
        if (e.key === "ArrowUp") {
          chatStore.nextSession(-1);
        } else if (e.key === "ArrowDown") {
          chatStore.nextSession(1);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
}

function LeaveMessageModal(props: {
  code: string;
  onClose: () => void;
}) {
  const [nickname, setNickname] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedNickname = nickname.trim();
    const trimmedContent = content.trim();

    if (!trimmedNickname || !trimmedContent) {
      showToast("请填写昵称和留言内容哦～");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/leon-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: props.code,
          nickname: trimmedNickname,
          content: trimmedContent,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast("留言已送达，感谢你的支持！");
        props.onClose();
      } else {
        showToast(data.message ?? "提交失败，请稍后重试。");
      }
    } catch (error) {
      console.error(error);
      showToast("⚠️ 提交失败，请检查网络或服务器。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="给Leon留言"
      actions={[
        <IconButton
          key="cancel"
          text="取消"
          icon={<CancelIcon />}
          bordered
          shadow
          onClick={props.onClose}
        />,
        <IconButton
          key="confirm"
          text={submitting ? "提交中..." : "提交留言"}
          type="primary"
          icon={<ConfirmIcon />}
          bordered
          shadow
          disabled={submitting}
          onClick={handleSubmit}
        />,
      ]}
      onClose={props.onClose}
    >
      <div className={styles["leave-message-form"]}>
        <label className={styles["leave-message-label"]}>留言昵称</label>
        <input
          className={styles["leave-message-input"]}
          placeholder="方便我称呼你的昵称"
          value={nickname}
          onChange={(e) => setNickname(e.currentTarget.value)}
        />

        <label className={styles["leave-message-label"]}>留言内容</label>
        <textarea
          className={styles["leave-message-textarea"]}
          placeholder="写下想对Leon说的话吧～"
          rows={4}
          value={content}
          onChange={(e) => setContent(e.currentTarget.value)}
        />

        <div className={styles["leave-message-tip"]}>
          留言会安全存放在服务器本地，仅供 Leon 查看。
        </div>
      </div>
    </Modal>
  );
}

function showLeaveMessageModal(code: string) {
  const div = document.createElement("div");
  div.className = "modal-mask";
  document.body.appendChild(div);

  const root = createRoot(div);

  const handleClose = () => {
    root.unmount();
    div.remove();
  };

  root.render(<LeaveMessageModal code={code} onClose={handleClose} />);
}

function useDragSideBar() {
  const limit = (x: number) => Math.min(MAX_SIDEBAR_WIDTH, x);

  const config = useAppConfig();
  const startX = useRef(0);
  const startDragWidth = useRef(config.sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH);
  const lastUpdateTime = useRef(Date.now());

  const toggleSideBar = () => {
    config.update((config) => {
      if (config.sidebarWidth < MIN_SIDEBAR_WIDTH) {
        config.sidebarWidth = DEFAULT_SIDEBAR_WIDTH;
      } else {
        config.sidebarWidth = NARROW_SIDEBAR_WIDTH;
      }
    });
  };

  const onDragStart = (e: MouseEvent) => {
    // Remembers the initial width each time the mouse is pressed
    startX.current = e.clientX;
    startDragWidth.current = config.sidebarWidth;
    const dragStartTime = Date.now();

    const handleDragMove = (e: MouseEvent) => {
      if (Date.now() < lastUpdateTime.current + 20) {
        return;
      }
      lastUpdateTime.current = Date.now();
      const d = e.clientX - startX.current;
      const nextWidth = limit(startDragWidth.current + d);
      config.update((config) => {
        if (nextWidth < MIN_SIDEBAR_WIDTH) {
          config.sidebarWidth = NARROW_SIDEBAR_WIDTH;
        } else {
          config.sidebarWidth = nextWidth;
        }
      });
    };

    const handleDragEnd = () => {
      // In useRef the data is non-responsive, so `config.sidebarWidth` can't get the dynamic sidebarWidth
      window.removeEventListener("pointermove", handleDragMove);
      window.removeEventListener("pointerup", handleDragEnd);

      // if user click the drag icon, should toggle the sidebar
      const shouldFireClick = Date.now() - dragStartTime < 300;
      if (shouldFireClick) {
        toggleSideBar();
      }
    };

    window.addEventListener("pointermove", handleDragMove);
    window.addEventListener("pointerup", handleDragEnd);
  };

  const isMobileScreen = useMobileScreen();
  const shouldNarrow =
    !isMobileScreen && config.sidebarWidth < MIN_SIDEBAR_WIDTH;

  useEffect(() => {
    const barWidth = shouldNarrow
      ? NARROW_SIDEBAR_WIDTH
      : limit(config.sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH);
    const sideBarWidth = isMobileScreen ? "100vw" : `${barWidth}px`;
    document.documentElement.style.setProperty("--sidebar-width", sideBarWidth);
  }, [config.sidebarWidth, isMobileScreen, shouldNarrow]);

  return {
    onDragStart,
    shouldNarrow,
  };
}

export function SideBar(props: { className?: string }) {
  const chatStore = useChatStore();

  // drag side bar
  const { onDragStart, shouldNarrow } = useDragSideBar();
  const navigate = useNavigate();
  const config = useAppConfig();
  const isMobileScreen = useMobileScreen();
  const isIOSMobile = useMemo(
    () => isIOS() && isMobileScreen,
    [isMobileScreen],
  );

  useHotKey();

  const handleLeaveMessageClick = async () => {
    const input = await showPasswordPrompt(
      "请输入访问密码（输入内容会被隐藏）",
      "",
    );

    if (!input) return;

    try {
      const res = await fetch("/api/prompt-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: input }),
      });

      const data = await res.json();

      if (data.success) {
        showLeaveMessageModal(input);
      } else {
        showToast("❌ 密码错误，请重试。");
      }
    } catch (err) {
      console.error(err);
      showToast("⚠️ 验证失败，请检查网络或服务器。");
    }
  };

  return (
    <div
      className={`${styles.sidebar} ${props.className} ${
        shouldNarrow && styles["narrow-sidebar"]
      }`}
      style={{
        // #3016 disable transition on ios mobile screen
        transition: isMobileScreen && isIOSMobile ? "none" : undefined,
      }}
    >
      <div className={styles["sidebar-header"]} data-tauri-drag-region>
        <div className={styles["sidebar-title"]} data-tauri-drag-region>
          ChatGPT国内直达版
        </div>
        <div className={styles["sidebar-sub-title"]}>
          Modified and maintained by: <br />
          Leon_B_F_Li <br />
          Trevor_Y_Z_Li
        </div>
        <div className={styles["sidebar-logo"] + " no-dark"}>
          <ChatGptIcon />
        </div>
      </div>

      <div className={styles["sidebar-header-bar"]}>
        <IconButton
          icon={<MaskIcon />}
          text={shouldNarrow ? undefined : Locale.Mask.Name}
          className={styles["sidebar-bar-button"]}
          onClick={() => {
            if (config.dontShowMaskSplashScreen !== true) {
              navigate(Path.NewChat, { state: { fromHome: true } });
            } else {
              navigate(Path.Masks, { state: { fromHome: true } });
            }
          }}
          shadow
        />
        {/* <IconButton
          icon={<PluginIcon />}
          text={shouldNarrow ? undefined : Locale.Plugin.Name}
          className={styles["sidebar-bar-button"]}
          onClick={() => showToast(Locale.WIP)}
          shadow
        /> */}
        {/* <IconButton
          icon={<PluginIcon />}
          text={shouldNarrow ? undefined : Locale.Plugin.Name}
          className={styles["sidebar-bar-button"]}
          onClick={() => {
            const input = prompt("请输入访问密码：");
            const correct = process.env.NEXT_PUBLIC_CODE;
            if (input === correct) {
              const contact =
                process.env.NEXT_PUBLIC_CONTACT || "联系方式(VX)：Leon_B_F_Li";
              alert("✅ 验证成功！\n" + contact);
            } else if (input !== null) {
              alert("❌ 密码错误，请重试。");
            }
          }}
          shadow
        /> */}
        <IconButton
          icon={<PluginIcon />}
          text={shouldNarrow ? undefined : Locale.Plugin.Name}
          className={styles["sidebar-bar-button"]}
          onClick={async () => {
            // 使用自定义的弹窗输入，保持与默认 UI 一致
            // 使用密码输入弹窗，隐藏字符，并给出提示
            const input = await showPasswordPrompt(
              "请输入访问密码（输入内容会被隐藏）",
              "",
            );
            if (!input) return;

            try {
              const res = await fetch("/api/prompt-auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: input }),
              });

              const data = await res.json();

              if (data.success) {
                // 根据环境变量或默认值获取联系方式
                const contact =
                  process.env.NEXT_PUBLIC_CONTACT || "Leon_B_F_Li（vx可联系）";
                // 弹出成功提示，并提供复制功能
                showToast(
                  `✅ 验证成功！联系方式：${contact}`,
                  {
                    text: "复制",
                    onClick: () => {
                      // 尝试写入剪贴板，成功或失败均提示
                      navigator.clipboard
                        .writeText(contact)
                        .then(() => {
                          showToast(
                            // 显示复制成功的提示
                            Locale.Copy?.Success || "已写入剪切板",
                          );
                        })
                        .catch(() => {
                          showToast(
                            Locale.Copy?.Failed || "复制失败，请赋予剪切板权限",
                          );
                        });
                    },
                  },
                  // 延长提示的显示时长到 5 秒
                  5000,
                );
              } else {
                showToast("❌ 密码错误，请重试。");
              }
            } catch (err) {
              showToast("⚠️ 验证失败，请检查网络或服务器。");
              console.error(err);
            }
          }}
          shadow
        />
      </div>

      <div
        className={styles["sidebar-body"]}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            navigate(Path.Home);
          }
        }}
      >
        <ChatList narrow={shouldNarrow} />
      </div>

      <div className={styles["sidebar-tail"]}>
        <div className={styles["sidebar-actions"]}>
          <div className={styles["sidebar-action"] + " " + styles.mobile}>
            <IconButton
              icon={<DeleteIcon />}
              onClick={async () => {
                if (await showConfirm(Locale.Home.DeleteChat)) {
                  chatStore.deleteSession(chatStore.currentSessionIndex);
                }
              }}
            />
          </div>
          <div className={styles["sidebar-action"]}>
            <Link to={Path.Settings}>
              <IconButton icon={<SettingsIcon />} shadow />
            </Link>
          </div>
        </div>
        <div className={styles["sidebar-primary-actions"]}>
          <IconButton
            icon={<PluginIcon />}
            text={shouldNarrow ? undefined : "给LEON留言"}
            className={styles["sidebar-bar-button"]}
            onClick={handleLeaveMessageClick}
            shadow
          />
          <IconButton
            icon={<AddIcon />}
            text={shouldNarrow ? undefined : Locale.Home.NewChat}
            onClick={() => {
              if (config.dontShowMaskSplashScreen) {
                chatStore.newSession();
                navigate(Path.Chat);
              } else {
                navigate(Path.NewChat);
              }
            }}
            shadow
          />
        </div>
      </div>

      <div
        className={styles["sidebar-drag"]}
        onPointerDown={(e) => onDragStart(e as any)}
      >
        <DragIcon />
      </div>
    </div>
  );
}
