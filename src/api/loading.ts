import { ElLoading } from "element-plus";

let load: ReturnType<typeof ElLoading.service> | null = null;
let timer: NodeJS.Timeout | null = null;
let isStart = false;
export function start() {
  if (isStart) {
    return;
  }

  isStart = true;
  load = ElLoading.service({
    lock: true,
    text: "loading",
    background: "rgba(0,0,0,0.7)",
  });

  timer = setTimeout(end, 120 * 1000); // 超时120秒，则自动关闭
}
export function end() {
  isStart = false;

  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  if (load) {
    load.close();
    load = null;
  }
}
