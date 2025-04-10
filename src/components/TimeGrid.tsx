
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
  const timeBlocksByHour: TimeBlock[][] = [];
  timeBlocks.forEach((block) => {
    if (!timeBlocksByHour[block.hourIndex]) {
      timeBlocksByHour[block.hourIndex] = [];
    }
    timeBlocksByHour[block.hourIndex][block.minuteIndex] = block;
  });

  // Filter out empty hours (in case of sparse data)
  const filteredTimeBlocksByHour = timeBlocksByHour.filter(hour => hour && hour.length > 0);

  return (
    <div className="grid grid-flow-col auto-cols-fr gap-1 bg-gridBg p-2 rounded-md shadow-sm">
      {filteredTimeBlocksByHour.map((hourBlocks, hourIdx) => (
        <div key={`hour-${hourIdx}`} className="flex flex-col gap-1">
          {hourBlocks
            .filter(block => block)
            .map((block) => {
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
