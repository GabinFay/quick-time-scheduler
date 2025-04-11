
import React from "react";
import { TimeBlock, Task } from "@/types";
import TimeBlockComponent from "./TimeBlock";
import { Minus } from "lucide-react";

interface TimeGridProps {
  timeBlocks: TimeBlock[];
  tasks: Task[];
  onDropTask: (taskId: string, timeBlockId: string, taskTitle?: string) => void;
  onTaskReorder: (taskId: string, timeBlockId: string) => void;
  onInsertBlock?: (hourIndex: number, minuteIndex: number) => void;
  onDeleteFirstColumn?: () => void;
}

const TimeGrid: React.FC<TimeGridProps> = ({
  timeBlocks,
  tasks,
  onDropTask,
  onTaskReorder,
  onInsertBlock,
  onDeleteFirstColumn,
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
      {sortedHours.map((hour, index) => (
        <div key={`hour-${hour}`} className="flex flex-col gap-1 relative">
          {index === 0 && onDeleteFirstColumn && (
            <button 
              onClick={onDeleteFirstColumn}
              className="absolute -top-4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                bg-red-500 hover:bg-red-600 rounded-full w-6 h-6 flex items-center justify-center 
                z-10 shadow-md"
              title="Delete first column"
            >
              <Minus size={16} className="text-white" />
            </button>
          )}
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
