
import React from "react";
import { Task } from "@/types";
import { useDrag } from "react-dnd";
import { X } from "lucide-react";

interface TaskItemProps {
  task: Task;
  onTaskReorder?: (taskId: string, timeBlockId: string) => void;
  onRemoveTask?: (taskId: string) => void;
  isScheduled: boolean;
  timeBlockId?: string;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onTaskReorder,
  onRemoveTask,
  isScheduled,
  timeBlockId,
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: "TASK",
    item: { id: task.id, type: "TASK", timeBlockId },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemoveTask) {
      onRemoveTask(task.id);
    }
  };

  return (
    <div
      ref={drag}
      className={`p-2 rounded text-sm cursor-move border border-taskBorder bg-taskBg ${
        isDragging ? "opacity-50" : ""
      }`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="flex justify-between items-center">
        <span>{task.title}</span>
        {!isScheduled && onRemoveTask && (
          <button
            onClick={handleRemove}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskItem;
