
import { TimeBlock } from "@/types";

// Generate time blocks for the next n hours in 10 minute increments
export function generateTimeBlocks(hours: number): TimeBlock[] {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const roundedMinutes = Math.floor(currentMinutes / 10) * 10;
  
  // Start at the beginning of the current hour, not just the current time
  const startTime = new Date(now);
  startTime.setMinutes(0, 0, 0); // Set to the beginning of the current hour
  
  const blocks: TimeBlock[] = [];
  
  for (let h = 0; h < hours; h++) {
    for (let m = 0; m < 60; m += 10) {
      const blockTime = new Date(startTime);
      blockTime.setMinutes(blockTime.getMinutes() + (h * 60) + m);
      
      const hours = blockTime.getHours().toString().padStart(2, "0");
      const mins = blockTime.getMinutes().toString().padStart(2, "0");
      const timeString = `${hours}:${mins}`;
      
      const minuteIndex = m / 10;
      
      // Check if this time block is the current time (within the current 10 minute window)
      const isCurrentTime = h === 0 && m === roundedMinutes;
      
      blocks.push({
        id: `${hours}-${mins}`,
        time: timeString,
        hourIndex: h,
        minuteIndex,
        isCurrentTime,
      });
    }
  }
  
  return blocks;
}

// Gets the index of a time block within the flattened array
export function getTimeBlockIndex(blocks: TimeBlock[], timeBlockId: string): number {
  return blocks.findIndex(block => block.id === timeBlockId);
}

// Check if an hour has passed and we need to shift columns
export function shouldRemoveFirstHour(
  lastUpdateTime: Date,
  timeBlocks: TimeBlock[]
): boolean {
  if (!timeBlocks.length) return false;
  
  const now = new Date();
  const timeDiffMinutes = (now.getTime() - lastUpdateTime.getTime()) / (1000 * 60);
  
  // If more than 60 minutes have passed since the last update
  return timeDiffMinutes >= 60;
}

// Remove the first hour from the time blocks
export function removeFirstHour(
  timeBlocks: TimeBlock[]
): TimeBlock[] {
  // If there are no blocks or fewer than 6 blocks (less than an hour), return the current blocks
  if (timeBlocks.length <= 6) return timeBlocks;
  
  // Filter out the blocks with hourIndex === 0
  const updatedBlocks = timeBlocks.filter(block => block.hourIndex !== 0)
    .map(block => ({
      ...block,
      hourIndex: block.hourIndex - 1
    }));
  
  return updatedBlocks;
}

// Get the current time block info (for tracking current time)
export function getCurrentTimeInfo(): { hour: number, minute: number } {
  const now = new Date();
  const hour = now.getHours();
  const minute = Math.floor(now.getMinutes() / 10) * 10;
  return { hour, minute };
}

// Update a block to mark it as current time if it matches the current time
export function updateCurrentTimeBlock(block: TimeBlock): TimeBlock {
  const { hour, minute } = getCurrentTimeInfo();
  const blockHour = parseInt(block.time.split(':')[0]);
  const blockMinute = parseInt(block.time.split(':')[1]);
  
  const isCurrentTime = blockHour === hour && blockMinute === minute;
  
  return {
    ...block,
    isCurrentTime
  };
}

