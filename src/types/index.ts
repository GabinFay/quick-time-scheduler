
export interface Task {
  id: string;
  title: string;
  color?: string;
  timeBlockId?: string;
}

export interface TimeBlock {
  id: string;
  time: string; // Format: "HH:MM"
  hourIndex: number;
  minuteIndex: number;
  isCurrentTime: boolean;
}
