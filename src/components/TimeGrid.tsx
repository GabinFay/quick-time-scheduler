
import React from "react";
import { TimeBlock, Task } from "@/types";
import TimeBlockComponent from "./TimeBlock";

interface TimeGridProps {
  timeBlocks: TimeBlock[];
  tasks: Task[];
  onDropTask: (taskId: string, timeBlockId: string, taskTitle?: string) => void;
  onTaskReorder: (taskId: string, timeBlockId: string) => void;
  onInsertBlock?: (hourIndex: number, minuteIndex: number) => void;
}

const TimeGrid: React.FC<TimeGridProps> = ({
  timeBlocks,
  tasks,
  onDropTask,
  onTaskReorder,
  onInsertBlock,
}) => {
  // Group timeBlocks by hour
  const timeBlocksByHour: { [hour: number]: TimeBlock[] } = {};
  
  timeBlocks.forEach((block) => {
    if (!timeBlocksByHour[block.hourIndex]) {
      timeBlocksByHour[block.hourIndex] = [];
    }
    timeBlocksByHour[block.hourIndex].push(block);
  });
  
  // Sort blocks within each hour
  Object.keys(timeBlocksByHour).forEach(hour => {
    const hourNum = parseInt(hour, 10);
    timeBlocksByHour[hourNum].sort((a, b) => a.minuteIndex - b.minuteIndex);
  });
  
  // Convert to array and sort by hour
  const sortedHours = Object.keys(timeBlocksByHour)
    .map(hour => parseInt(hour, 10))
    .sort((a, b) => a - b);

  return (
    <div className="grid grid-flow-col auto-cols-fr gap-1 bg-gridBg p-2 rounded-md shadow-sm">
      {sortedHours.map((hour) => (
        <div key={`hour-${hour}`} className="flex flex-col gap-1">
          {timeBlocksByHour[hour].map((block) => {
            const blockTasks = tasks.filter(
              (task) => task.timeBlockId === block.id
            );
            
            return (
              <TimeBlockComponent
                key={block.id}
                timeBlock={block}
                tasks={blockTasks}
                onDropTask={onDropTask}
                onTaskReorder={onTaskReorder}
                onInsertBlock={onInsertBlock}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default TimeGrid;
