
import React, { useState, useRef } from "react";
import { TimeBlock, Task } from "@/types";
import TaskItem from "./TaskItem";
import { useDrop } from "react-dnd";
import { Input } from "./ui/input";
import { nanoid } from 'nanoid';
import { Plus } from "lucide-react";

interface TimeBlockProps {
  timeBlock: TimeBlock;
  tasks: Task[];
  onDropTask: (taskId: string, timeBlockId: string, taskTitle?: string) => void;
  onTaskReorder: (taskId: string, timeBlockId: string) => void;
  onInsertBlock?: (hourIndex: number, minuteIndex: number) => void;
}

const TimeBlockComponent: React.FC<TimeBlockProps> = ({
  timeBlock,
  tasks,
  onDropTask,
  onTaskReorder,
  onInsertBlock,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showInsertButton, setShowInsertButton] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleBlockClick = () => {
    // Only show input if there are no tasks in this time block
    if (tasks.length === 0 && !isEditing) {
      setIsEditing(true);
      // Focus the input after it renders
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      // Create a new task directly in this time block
      const newTask: Task = {
        id: nanoid(),
        title: newTaskTitle.trim(),
        timeBlockId: timeBlock.id,
      };
      onDropTask(newTask.id, timeBlock.id, newTaskTitle.trim());
      setNewTaskTitle("");
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setNewTaskTitle("");
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    setNewTaskTitle("");
  };

  const handleInsert = () => {
    if (onInsertBlock) {
      onInsertBlock(timeBlock.hourIndex, timeBlock.minuteIndex);
    }
  };

  return (
    <div
      ref={drop}
      className={`p-2 min-h-16 rounded relative ${
        timeBlock.isCurrentTime
          ? "bg-current bg-opacity-10 border-l-4 border-current"
          : "bg-timeBlock"
      } ${isOver ? "bg-opacity-50" : ""}`}
      onClick={handleBlockClick}
      onMouseEnter={() => setShowInsertButton(true)}
      onMouseLeave={() => setShowInsertButton(false)}
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
        
        {isEditing && tasks.length === 0 && (
          <Input
            ref={inputRef}
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="Type task & press Enter"
            className="w-full text-sm"
            autoFocus
          />
        )}
      </div>
      
      {showInsertButton && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleInsert();
          }}
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 bg-green-500 hover:bg-green-600 rounded-full w-5 h-5 flex items-center justify-center z-10 shadow-md"
          title="Add time block"
        >
          <Plus size={14} className="text-white" />
        </button>
      )}
    </div>
  );
};

export default TimeBlockComponent;
