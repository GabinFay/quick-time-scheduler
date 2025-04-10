
import React, { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Task, TimeBlock } from "@/types";
import TimeGrid from "./TimeGrid";
import UnscheduledZone from "./UnscheduledZone";
import { generateTimeBlocks, getTimeBlockIndex, shouldRemoveFirstHour, removeFirstHour } from "@/utils/timeUtils";
import { toast } from "@/components/ui/sonner";

const Scheduler: React.FC = () => {
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<Task[]>([]);
  const [unscheduledTasks, setUnscheduledTasks] = useState<Task[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  
  // Initialize time blocks
  useEffect(() => {
    const initializeTimeBlocks = () => {
      const newBlocks = generateTimeBlocks(4); // Generate blocks for next 4 hours
      setTimeBlocks(newBlocks);
      setLastUpdateTime(new Date());
    };
    
    initializeTimeBlocks();
    
    // Update every minute to check for hour shifts and current time block
    const intervalId = setInterval(() => {
      if (shouldRemoveFirstHour(lastUpdateTime, timeBlocks)) {
        // Remove first hour column and update tasks
        const updatedBlocks = removeFirstHour(timeBlocks);
        setTimeBlocks(updatedBlocks);
        
        // Update tasks with new block references or move to unscheduled
        const removedBlockIds = timeBlocks
          .filter(block => block.hourIndex === 0)
          .map(block => block.id);
        
        const tasksToUnschedule = scheduledTasks.filter(task => 
          task.timeBlockId && removedBlockIds.includes(task.timeBlockId)
        );
        
        // Move expired tasks to unscheduled
        if (tasksToUnschedule.length > 0) {
          const updatedScheduledTasks = scheduledTasks.filter(
            task => !removedBlockIds.includes(task.timeBlockId || '')
          );
          
          const expiredTasks = tasksToUnschedule.map(task => ({
            ...task,
            timeBlockId: undefined
          }));
          
          setScheduledTasks(updatedScheduledTasks);
          setUnscheduledTasks([...unscheduledTasks, ...expiredTasks]);
          toast("Tasks from the past hour have been moved to unscheduled");
        }
        
        setLastUpdateTime(new Date());
      } else {
        // Just update the current time indicator
        const newBlocks = timeBlocks.map(block => ({
          ...block,
          isCurrentTime: checkIsCurrentTime(block)
        }));
        setTimeBlocks(newBlocks);
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, [timeBlocks, scheduledTasks, unscheduledTasks, lastUpdateTime]);
  
  // Check if a time block represents the current time
  const checkIsCurrentTime = (block: TimeBlock): boolean => {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, "0");
    const currentMinute = Math.floor(now.getMinutes() / 10) * 10;
    const currentMinuteStr = currentMinute.toString().padStart(2, "0");
    
    return block.time === `${currentHour}:${currentMinuteStr}`;
  };
  
  // Handle dropping a task into a time block
  const handleDropTaskToTimeBlock = (taskId: string, timeBlockId: string) => {
    // Find the task in either scheduled or unscheduled tasks
    const scheduledTask = scheduledTasks.find(task => task.id === taskId);
    const unscheduledTask = unscheduledTasks.find(task => task.id === taskId);
    
    if (!scheduledTask && !unscheduledTask) return;
    
    const task = scheduledTask || unscheduledTask;
    if (!task) return;
    
    const targetBlockIndex = getTimeBlockIndex(timeBlocks, timeBlockId);
    
    if (targetBlockIndex === -1) return;
    
    // If the task is from unscheduled tasks, remove it
    if (unscheduledTask) {
      setUnscheduledTasks(unscheduledTasks.filter(t => t.id !== taskId));
    } else if (scheduledTask && scheduledTask.timeBlockId === timeBlockId) {
      // If dropping to the same block, do nothing
      return;
    } else if (scheduledTask) {
      // If it's already scheduled, remove from current location
      setScheduledTasks(scheduledTasks.filter(t => t.id !== taskId));
    }
    
    // Shift tasks in the same column forward
    const tasksInSameHourColumn = scheduledTasks.filter(t => {
      if (!t.timeBlockId) return false;
      const blockIndex = getTimeBlockIndex(timeBlocks, t.timeBlockId);
      if (blockIndex === -1) return false;
      
      const targetBlock = timeBlocks[targetBlockIndex];
      const taskBlock = timeBlocks[blockIndex];
      
      return (
        taskBlock.hourIndex === targetBlock.hourIndex &&
        taskBlock.minuteIndex >= targetBlock.minuteIndex &&
        t.id !== taskId
      );
    });
    
    // Update all affected tasks by shifting them down
    const updatedTasks = scheduledTasks
      .filter(t => !tasksInSameHourColumn.some(st => st.id === t.id) && t.id !== taskId)
      .concat(
        tasksInSameHourColumn.map(t => {
          if (!t.timeBlockId) return t;
          const blockIndex = getTimeBlockIndex(timeBlocks, t.timeBlockId);
          const block = timeBlocks[blockIndex];
          
          // Find the next block in the same column
          const nextMinuteIndex = block.minuteIndex + 1;
          if (nextMinuteIndex > 5) {
            // If this would push beyond this hour, move to unscheduled
            setUnscheduledTasks([...unscheduledTasks, { ...t, timeBlockId: undefined }]);
            return null;
          }
          
          const nextBlockInColumn = timeBlocks.find(
            b => b.hourIndex === block.hourIndex && b.minuteIndex === nextMinuteIndex
          );
          
          if (!nextBlockInColumn) return t;
          
          return { ...t, timeBlockId: nextBlockInColumn.id };
        })
        .filter(Boolean) as Task[]
      );
    
    // Add the dragged task to its new position
    const newScheduledTask = { ...task, timeBlockId };
    setScheduledTasks([...updatedTasks, newScheduledTask]);
  };
  
  // Handle reordering tasks
  const handleReorderTask = (taskId: string, timeBlockId: string) => {
    const task = scheduledTasks.find(t => t.id === taskId);
    if (!task || task.timeBlockId === timeBlockId) return;
    
    const updatedTasks = scheduledTasks.map(t => 
      t.id === taskId ? { ...t, timeBlockId } : t
    );
    
    setScheduledTasks(updatedTasks);
  };
  
  // Handle adding a new unscheduled task
  const handleAddUnscheduledTask = (task: Task) => {
    setUnscheduledTasks([...unscheduledTasks, task]);
  };
  
  // Handle removing a task
  const handleRemoveTask = (taskId: string) => {
    const fromScheduled = scheduledTasks.find(t => t.id === taskId);
    const fromUnscheduled = unscheduledTasks.find(t => t.id === taskId);
    
    if (fromScheduled) {
      const task = {...fromScheduled, timeBlockId: undefined};
      setScheduledTasks(scheduledTasks.filter(t => t.id !== taskId));
      setUnscheduledTasks([...unscheduledTasks, task]);
    } else if (fromUnscheduled) {
      setUnscheduledTasks(unscheduledTasks.filter(t => t.id !== taskId));
    }
  };
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Quick Time Scheduler</h1>
        
        <TimeGrid
          timeBlocks={timeBlocks}
          tasks={scheduledTasks}
          onDropTask={handleDropTaskToTimeBlock}
          onTaskReorder={handleReorderTask}
        />
        
        <UnscheduledZone
          tasks={unscheduledTasks}
          onAddTask={handleAddUnscheduledTask}
          onRemoveTask={handleRemoveTask}
        />
      </div>
    </DndProvider>
  );
};

export default Scheduler;
