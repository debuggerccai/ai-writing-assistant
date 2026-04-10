import { type ClassValue, clsx } from "clsx"
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { twMerge } from "tailwind-merge"
import 'dayjs/locale/zh-cn';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export function formatRelativeTime(isoString: string): string {
  const now = dayjs();
  const target = dayjs(isoString);
  const diffMinutes = now.diff(target, 'minute');

  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;

  const diffHours = now.diff(target, 'hour');
  if (diffHours < 24) return `${diffHours}小时前`;

  const diffDays = now.diff(target, 'day');
  if (diffDays === 1) return '昨天';
  if (diffDays === 2) return '前天';
  if (diffDays < 7) return `${diffDays}天前`;

  return target.format('YYYY-MM-DD');
}

export function thousandSeparator(num: number) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
