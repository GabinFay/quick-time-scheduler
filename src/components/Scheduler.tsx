
import React, { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Task, TimeBlock } from "@/types";
import TimeGrid from "./TimeGrid";
import UnscheduledZone from "./UnscheduledZone";
import { generateTimeBlocks, getTimeBlockIndex, shouldRemoveFirstHour, removeFirstHour } from "@/utils/timeUtils";
import { toast } from "sonner";
import { nanoid } from "nanoid";

const Scheduler: React.FC = () => {
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<Task[]>([]);
  const [unscheduledTasks, setUnscheduledTasks] = useState<Task[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  
  useEffect(() => {
    const initializeTimeBlocks = () => {
      const newBlocks = generateTimeBlocks(4); // Generate blocks for next 4 hours
      setTimeBlocks(newBlocks);
      setLastUpdateTime(new Date());
    };
    
    initializeTimeBlocks();
  }, []); // Empty dependency array so this only runs once on mount
  
  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeBlocks(prevTimeBlocks => {
        if (shouldRemoveFirstHour(lastUpdateTime, prevTimeBlocks)) {
          const updatedBlocks = removeFirstHour(prevTimeBlocks);
          
          const removedBlockIds = prevTimeBlocks
            .filter(block => block.hourIndex === 0)
            .map(block => block.id);
          
          const tasksToUnschedule = scheduledTasks.filter(task => 
            task.timeBlockId && removedBlockIds.includes(task.timeBlockId)
          );
          
          if (tasksToUnschedule.length > 0) {
            const updatedScheduledTasks = scheduledTasks.filter(
              task => !removedBlockIds.includes(task.timeBlockId || '')
            );
            
            const expiredTasks = tasksToUnschedule.map(task => ({
              ...task,
              timeBlockId: undefined
            }));
            
            setScheduledTasks(updatedScheduledTasks);
            setUnscheduledTasks(prev => [...prev, ...expiredTasks]);
            toast("Tasks from the past hour have been moved to unscheduled");
          }
          
          setLastUpdateTime(new Date());
          return updatedBlocks;
        } else {
          return prevTimeBlocks.map(block => ({
            ...block,
            isCurrentTime: checkIsCurrentTime(block)
          }));
        }
      });
    }, 60000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, [scheduledTasks, unscheduledTasks, lastUpdateTime]);
  
  const checkIsCurrentTime = (block: TimeBlock): boolean => {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, "0");
    const currentMinute = Math.floor(now.getMinutes() / 10) * 10;
    const currentMinuteStr = currentMinute.toString().padStart(2, "0");
    
    return block.time === `${currentHour}:${currentMinuteStr}`;
  };
  
  const handleDropTaskToTimeBlock = (taskId: string, timeBlockId: string, taskTitle?: string) => {
    const existingTask = [...scheduledTasks, ...unscheduledTasks].find(task => task.id === taskId);
    
    if (!existingTask) {
      const newTask: Task = {
        id: taskId,
        title: taskTitle || "New Task",
        timeBlockId: timeBlockId,
      };
      setScheduledTasks(prev => [...prev, newTask]);
      return;
    }
    
    const scheduledTask = scheduledTasks.find(task => task.id === taskId);
    const unscheduledTask = unscheduledTasks.find(task => task.id === taskId);
    
    if (!scheduledTask && !unscheduledTask) return;
    
    const task = scheduledTask || unscheduledTask;
    if (!task) return;
    
    const targetBlockIndex = getTimeBlockIndex(timeBlocks, timeBlockId);
    
    if (targetBlockIndex === -1) return;
    
    if (unscheduledTask) {
      setUnscheduledTasks(unscheduledTasks.filter(t => t.id !== taskId));
    } else if (scheduledTask && scheduledTask.timeBlockId === timeBlockId) {
      return;
    } else if (scheduledTask) {
      setScheduledTasks(scheduledTasks.filter(t => t.id !== taskId));
    }
    
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
    
    const updatedTasks = scheduledTasks
      .filter(t => !tasksInSameHourColumn.some(st => st.id === t.id) && t.id !== taskId)
      .concat(
        tasksInSameHourColumn.map(t => {
          if (!t.timeBlockId) return t;
          const blockIndex = getTimeBlockIndex(timeBlocks, t.timeBlockId);
          const block = timeBlocks[blockIndex];
          
          const nextMinuteIndex = block.minuteIndex + 1;
          if (nextMinuteIndex > 5) {
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
    
    const newScheduledTask = { ...task, timeBlockId };
    setScheduledTasks([...updatedTasks, newScheduledTask]);
  };
  
  const handleReorderTask = (taskId: string, timeBlockId: string) => {
    const task = scheduledTasks.find(t => t.id === taskId);
    if (!task || task.timeBlockId === timeBlockId) return;
    
    const updatedTasks = scheduledTasks.map(t => 
      t.id === taskId ? { ...t, timeBlockId } : t
    );
    
    setScheduledTasks(updatedTasks);
  };
  
  const handleAddUnscheduledTask = (task: Task) => {
    setUnscheduledTasks([...unscheduledTasks, task]);
  };
  
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

  const handleInsertBlock = (hourIndex: number, minuteIndex: number) => {
    const currentBlock = timeBlocks.find(
      block => block.hourIndex === hourIndex && block.minuteIndex === minuteIndex
    );
    
    if (!currentBlock) return;
    
    const [hours, minutes] = currentBlock.time.split(":").map(Number);
    
    // Create a new date object for the inserted block (10 minutes after current block)
    const blockTime = new Date();
    blockTime.setHours(hours);
    blockTime.setMinutes(minutes + 10);
    
    const newBlockId = `block-${nanoid(6)}`;
    
    // Find blocks that need to be shifted (those in the same hour with higher minuteIndex)
    const blocksToShift = timeBlocks.filter(
      block => block.hourIndex === hourIndex && block.minuteIndex > minuteIndex
    );
    
    // Update minuteIndex for blocks that need to be shifted
    const updatedBlocks = timeBlocks.map(block => {
      if (blocksToShift.some(b => b.id === block.id)) {
        return {
          ...block,
          minuteIndex: block.minuteIndex + 1,
        };
      }
      return block;
    });
    
    // Create the new block to insert
    const newBlock: TimeBlock = {
      id: newBlockId,
      time: formatTime(blockTime),
      hourIndex: hourIndex,
      minuteIndex: minuteIndex + 1,
      isCurrentTime: false,
    };

    // Combine updated blocks with the new block
    let finalBlocks = [...updatedBlocks, newBlock];
    
    // Sort the blocks by hour and minute
    finalBlocks.sort((a, b) => {
      if (a.hourIndex !== b.hourIndex) {
        return a.hourIndex - b.hourIndex;
      }
      return a.minuteIndex - b.minuteIndex;
    });
    
    // Now update all time labels to maintain proper sequence
    finalBlocks = updateTimeLabels(finalBlocks);
    
    setTimeBlocks(finalBlocks);
    toast("New 10-minute block added");
  };
  
  // Helper function to format time as HH:MM
  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };
  
  // Helper function to update time labels for all blocks
  const updateTimeLabels = (blocks: TimeBlock[]): TimeBlock[] => {
    // Group blocks by hour
    const blocksByHour: { [key: number]: TimeBlock[] } = {};
    
    blocks.forEach(block => {
      if (!blocksByHour[block.hourIndex]) {
        blocksByHour[block.hourIndex] = [];
      }
      blocksByHour[block.hourIndex].push(block);
    });
    
    // Sort blocks within each hour by minuteIndex
    Object.keys(blocksByHour).forEach(hourKey => {
      const hour = parseInt(hourKey);
      blocksByHour[hour].sort((a, b) => a.minuteIndex - b.minuteIndex);
    });
    
    // Get the starting time from the first block
    if (blocks.length === 0) return blocks;
    
    const sortedHours = Object.keys(blocksByHour)
      .map(h => parseInt(h))
      .sort((a, b) => a - b);
    
    const result: TimeBlock[] = [];
    
    // For each hour, update the time labels
    sortedHours.forEach(hour => {
      const blocksInHour = blocksByHour[hour];
      
      // Find the first block in this hour to get the starting time
      const firstBlock = blocksInHour[0];
      const [firstHours, firstMinutes] = firstBlock.time.split(":").map(Number);
      
      // Create a date object for the start time of this hour
      const currentTime = new Date();
      currentTime.setHours(firstHours, firstMinutes, 0, 0);
      
      // Update each block in this hour
      blocksInHour.forEach((block, index) => {
        if (index > 0) {
          // For blocks after the first one, increment time by 10 minutes
          currentTime.setMinutes(currentTime.getMinutes() + 10);
        }
        
        result.push({
          ...block,
          time: formatTime(currentTime)
        });
      });
    });
    
    return result;
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
          onInsertBlock={handleInsertBlock}
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
