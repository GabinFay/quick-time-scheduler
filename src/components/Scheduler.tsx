import React, { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Task, TimeBlock } from "@/types";
import TimeGrid from "./TimeGrid";
import UnscheduledZone from "./UnscheduledZone";
import { 
  generateTimeBlocks, 
  getTimeBlockIndex, 
  shouldRemoveFirstHour, 
  removeFirstHour,
  getCurrentTimeInfo,
  updateCurrentTimeBlock,
  updateCurrentTimeBlocks,
  isCurrentTimeBlock
} from "@/utils/timeUtils";
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
          return updateCurrentTimeBlocks(updatedBlocks);
        } else {
          return updateCurrentTimeBlocks(prevTimeBlocks);
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
    
    const blockTime = new Date();
    blockTime.setHours(hours);
    blockTime.setMinutes(minutes + 10);
    
    const newBlockId = `block-${nanoid(6)}`;
    
    const blocksToShift = timeBlocks.filter(block => {
      return (block.hourIndex === hourIndex && block.minuteIndex > minuteIndex) ||
             (block.hourIndex > hourIndex);
    });
    
    const lastBlockInHour = timeBlocks.find(
      block => block.hourIndex === hourIndex && block.minuteIndex === 5
    );
    
    const newBlock: TimeBlock = {
      id: newBlockId,
      time: formatTime(blockTime),
      hourIndex: hourIndex,
      minuteIndex: minuteIndex + 1,
      isCurrentTime: isCurrentTimeBlock(formatTime(blockTime)),
    };
    
    const blockMoveMap = new Map<string, string>();
    
    let updatedBlocks = timeBlocks.map(block => {
      if (!blocksToShift.some(b => b.id === block.id)) {
        return block;
      }
      
      let newHourIndex = block.hourIndex;
      let newMinuteIndex = block.minuteIndex;
      
      if (block.hourIndex === hourIndex) {
        newMinuteIndex = block.minuteIndex + 1;
        
        if (newMinuteIndex > 5) {
          newHourIndex = block.hourIndex + 1;
          newMinuteIndex = 0;
        }
      } else {
        if (lastBlockInHour) {
          if (block.minuteIndex === 0) {
            newMinuteIndex = 1;
          } else {
            newMinuteIndex = block.minuteIndex + 1;
            
            if (newMinuteIndex > 5) {
              newHourIndex = block.hourIndex + 1;
              newMinuteIndex = 0;
            }
          }
        }
      }
      
      const updatedBlock = {
        ...block,
        hourIndex: newHourIndex,
        minuteIndex: newMinuteIndex,
      };
      
      blockMoveMap.set(block.id, `${newHourIndex}-${newMinuteIndex}`);
      return updatedBlock;
    });
    
    updatedBlocks = [...updatedBlocks, newBlock];
    
    updatedBlocks.sort((a, b) => {
      if (a.hourIndex !== b.hourIndex) {
        return a.hourIndex - b.hourIndex;
      }
      return a.minuteIndex - b.minuteIndex;
    });
    
    updatedBlocks = updateTimeLabels(updatedBlocks);
    
    const updatedTasks = scheduledTasks.map(task => {
      if (!task.timeBlockId) return task;
      
      const newPosition = blockMoveMap.get(task.timeBlockId);
      if (newPosition) {
        const targetBlock = updatedBlocks.find(block => 
          `${block.hourIndex}-${block.minuteIndex}` === newPosition
        );
        
        if (targetBlock) {
          return { ...task, timeBlockId: targetBlock.id };
        }
      }
      
      return task;
    });
    
    setTimeBlocks(updatedBlocks);
    setScheduledTasks(updatedTasks);
    toast("New 10-minute block added");
  };
  
  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };
  
  const updateTimeLabels = (blocks: TimeBlock[]): TimeBlock[] => {
    const blocksByHour: { [key: number]: TimeBlock[] } = {};
    
    blocks.forEach(block => {
      if (!blocksByHour[block.hourIndex]) {
        blocksByHour[block.hourIndex] = [];
      }
      blocksByHour[block.hourIndex].push(block);
    });
    
    Object.keys(blocksByHour).forEach(hourKey => {
      const hour = parseInt(hourKey);
      blocksByHour[hour].sort((a, b) => a.minuteIndex - b.minuteIndex);
    });
    
    const sortedHours = Object.keys(blocksByHour)
      .map(h => parseInt(h))
      .sort((a, b) => a - b);
    
    const result: TimeBlock[] = [];
    
    sortedHours.forEach(hour => {
      const blocksInHour = blocksByHour[hour];
      
      const firstBlock = blocksInHour[0];
      const [firstHours, firstMinutes] = firstBlock.time.split(":").map(Number);
      
      const currentTime = new Date();
      currentTime.setHours(firstHours, firstMinutes, 0, 0);
      
      blocksInHour.forEach((block, index) => {
        if (index > 0) {
          currentTime.setMinutes(currentTime.getMinutes() + 10);
        }
        
        const timeString = formatTime(currentTime);
        
        result.push({
          ...block,
          time: timeString,
          isCurrentTime: isCurrentTimeBlock(timeString)
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
