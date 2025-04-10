
import React, { useState } from "react";
import { Task } from "@/types";
import TaskItem from "./TaskItem";
import { useDrop } from "react-dnd";

interface UnscheduledZoneProps {
  tasks: Task[];
  onAddTask: (task: Task) => void;
  onRemoveTask: (taskId: string) => void;
}

const UnscheduledZone: React.FC<UnscheduledZoneProps> = ({
  tasks,
  onAddTask,
  onRemoveTask,
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim() !== "") {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title: newTaskTitle.trim(),
      };
      onAddTask(newTask);
      setNewTaskTitle("");
    }
  };

  const [{ isOver }, drop] = useDrop({
    accept: "TASK",
    drop: (item: { id: string }, monitor) => {
      if (monitor.didDrop()) return;
      // Moving a task from scheduled to unscheduled
      onRemoveTask(item.id);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  return (
    <div className="mt-6 bg-white p-4 rounded-md shadow-sm">
      <h2 className="text-lg font-semibold mb-3">Unscheduled Tasks</h2>
      <form onSubmit={handleAddTask} className="mb-4 flex gap-2">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="New task..."
          className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add
        </button>
      </form>
      <div
        ref={drop}
        className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 min-h-16 p-2 rounded-md ${
          isOver ? "bg-gray-100" : ""
        }`}
      >
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onRemoveTask={onRemoveTask}
            isScheduled={false}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-gray-400 text-center col-span-full py-4">
            No unscheduled tasks. Add one above or drag tasks here to unschedule.
          </div>
        )}
      </div>
    </div>
  );
};

export default UnscheduledZone;
