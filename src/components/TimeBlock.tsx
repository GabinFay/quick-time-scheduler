
import React from "react";
import { TimeBlock, Task } from "@/types";
import TaskItem from "./TaskItem";
import { useDrop } from "react-dnd";

interface TimeBlockProps {
  timeBlock: TimeBlock;
  tasks: Task[];
  onDropTask: (taskId: string, timeBlockId: string) => void;
  onTaskReorder: (taskId: string, timeBlockId: string) => void;
}

const TimeBlockComponent: React.FC<TimeBlockProps> = ({
  timeBlock,
  tasks,
  onDropTask,
  onTaskReorder,
}) => {
  const [{ isOver }, drop] = useDrop({
    accept: "TASK",
    drop: (item: { id: string; type: string }, monitor) => {
      if (monitor.didDrop()) return;
      onDropTask(item.id, timeBlock.id);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  return (
    <div
      ref={drop}
      className={`p-2 min-h-16 rounded ${
        timeBlock.isCurrentTime
          ? "bg-current bg-opacity-10 border-l-4 border-current"
          : "bg-timeBlock"
      } ${isOver ? "bg-opacity-50" : ""}`}
    >
      <div className="text-xs font-medium mb-1">{timeBlock.time}</div>
      <div className="space-y-1">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onTaskReorder={onTaskReorder}
            isScheduled={true}
            timeBlockId={timeBlock.id}
          />
        ))}
      </div>
    </div>
  );
};

export default TimeBlockComponent;
