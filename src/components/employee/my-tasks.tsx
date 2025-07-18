"use client"

import { useState, useEffect, useTransition, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  CheckSquare, 
  Search, 
  Timer,
  CheckCircle2,
  Circle,
  PlayCircle,
  Target,
  Activity,
  User,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Minus,
  ArrowUp,
  Zap,
  AlertTriangle
} from "lucide-react"
import { updateEmployeeTaskStatusAction } from "@/actions/task"
import { AITask } from "@/models/types"

interface EmployeeMyTasksProps {
  user?: any
  tasks?: any[]
}

const priorityConfig = {
  low: {
    color: "bg-emerald-500 border-emerald-400",
    textColor: "text-emerald-300",
    bgColor: "bg-emerald-900/50",
    icon: Circle,
    label: "Low",
  },
  medium: {
    color: "bg-amber-500 border-amber-400",
    textColor: "text-amber-300",
    bgColor: "bg-amber-900/50",
    icon: Minus,
    label: "Medium",
  },
  high: {
    color: "bg-orange-500 border-orange-400",
    textColor: "text-orange-300",
    bgColor: "bg-orange-900/50",
    icon: ArrowUp,
    label: "High",
  },
  critical: {
    color: "bg-red-500 border-red-400",
    textColor: "text-red-300",
    bgColor: "bg-red-900/50",
    icon: Zap,
    label: "Critical",
  },
};

const statusConfig = {
  pending: {
    color: "bg-blue-600",
    label: "To Do",
    icon: Circle,
  },
  started: {
    color: "bg-green-500",
    label: "In Progress",
    icon: PlayCircle,
  },
  done: {
    color: "bg-emerald-600",
    label: "Done",
    icon: CheckCircle2,
  },
  blocked: {
    color: "bg-red-500",
    label: "Blocked",
    icon: AlertTriangle,
  },
  // Default fallback
  default: {
    color: "bg-green-500",
    label: "Unknown",
    icon: Circle,
  },
};

export function EmployeeMyTasks({ user, tasks: propTasks }: EmployeeMyTasksProps) {
  const [loading, setLoading] = useState(false)
  const [tasks, setTasks] = useState<any[]>(propTasks || [])
  const [isPending, startTransition] = useTransition()
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek
    return new Date(today.setDate(diff))
  })

  useEffect(() => {
    if (propTasks) {
      setTasks(propTasks)
      console.log(`My Tasks - Using ${propTasks.length} tasks from props`)
      console.log("Tasks data:", propTasks)
      
      // Log sample task data structure
      if (propTasks.length > 0) {
        console.log("Sample task structure:", propTasks[0])
        console.log("Sample task created_at:", propTasks[0].created_at)
        console.log("Sample task due_date:", propTasks[0].due_date)
      }
    }
    if (user?.email) {
      console.log("My Tasks - User email:", user.email)
    }
  }, [propTasks, user])

  const formatDate = (
    dateValue: Date | { $date: { $numberLong: string } } | string | number | null | undefined
  ) => {
    console.log("formatDate input:", dateValue, typeof dateValue)
    if (!dateValue) {
      console.log("No date value, returning current date")
      return new Date()
    }
    
    if (dateValue instanceof Date) {
      console.log("Date instance:", dateValue)
      return dateValue
    } 
    
    if (typeof dateValue === 'string') {
      const parsedStringDate = new Date(dateValue)
      console.log("Parsed string date:", parsedStringDate)
      if (!isNaN(parsedStringDate.getTime())) {
        return parsedStringDate
      }
    }
    
    if (dateValue && typeof dateValue === "object" && dateValue.$date) {
      const parsedDate = new Date(Number.parseInt(dateValue.$date.$numberLong))
      console.log("Parsed MongoDB date:", parsedDate)
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate
      }
    }
    
    // Try to parse as timestamp
    if (typeof dateValue === 'number' || (typeof dateValue === 'string' && !isNaN(Number(dateValue)))) {
      const timestamp = Number(dateValue)
      const parsedTimestamp = new Date(timestamp)
      console.log("Parsed timestamp:", parsedTimestamp)
      if (!isNaN(parsedTimestamp.getTime())) {
        return parsedTimestamp
      }
    }
    
    console.log("Fallback to current date for:", dateValue)
    return new Date()
  }

  const getDurationHours = (duration: number | { $numberInt: string }) => {
    if (typeof duration === "number") {
      return duration
    } else if (
      duration &&
      typeof duration === "object" &&
      duration.$numberInt
    ) {
      return Number.parseInt(duration.$numberInt)
    }
    return 0
  }

  const getTaskId = (task: AITask): string => {
    return task._id || task.id || `task_${Math.random().toString(36).substr(2, 9)}`
  }

  const getTaskStats = () => {
    const pending = tasks.filter((t) => t.status === "pending").length
    const inProgress = tasks.filter((t) => t.status === "started").length
    const completed = tasks.filter((t) => t.status === "done").length
    const totalHours = tasks.reduce(
      (acc, task) => acc + getDurationHours(task.estimated_duration_hours),
      0
    )
    const completedHours = tasks
      .filter((t) => t.status === "done")
      .reduce(
        (acc, task) => acc + getDurationHours(task.estimated_duration_hours),
        0
      )

    return {
      pending,
      inProgress,
      completed,
      total: tasks.length,
      totalHours,
      completedHours,
      productivity: totalHours > 0 ? (completedHours / totalHours) * 100 : 0,
    }
  }

  const handleStatusChange = async (
    taskId: string,
    newStatus: "pending" | "in_progress" | "completed"
  ) => {
    console.log(`Updating task ${taskId} to status: ${newStatus}`)
    startTransition(async () => {
      try {
        const result = await updateEmployeeTaskStatusAction(taskId, newStatus)
        console.log("Status update result:", result)
        if (result.success) {
          // Update the local state
          setTasks(prev => {
            const updatedTasks = prev.map(task => 
              getTaskId(task) === taskId ? { ...task, status: newStatus } : task
            )
            console.log("Updated tasks state:", updatedTasks)
            return updatedTasks
          })
        } else {
          console.error("Failed to update task status:", result.error)
        }
      } catch (error) {
        console.error("Error updating task status:", error)
      }
    })
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesStatus =
        filterStatus === "all" || task.status === filterStatus
      const matchesPriority =
        filterPriority === "all" || task.priority === filterPriority
      const matchesSearch =
        searchQuery === "" ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesStatus && matchesPriority && matchesSearch
    })
  }, [tasks, filterStatus, filterPriority, searchQuery])

  // Generate timeline dates (2 weeks view)
  const timelineDates = useMemo(() => {
    const dates = []
    const startDate = new Date(currentWeekStart)
    for (let i = 0; i < 14; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      dates.push(date)
    }
    return dates
  }, [currentWeekStart])

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(
      currentWeekStart.getDate() + (direction === "next" ? 7 : -7)
    )
    setCurrentWeekStart(newDate)
  }

  const getTaskTimelinePosition = (task: AITask) => {
    const createdDate = formatDate(task.created_at)
    const dueDate = formatDate(task.due_date)
    const duration = getDurationHours(task.estimated_duration_hours)

    console.log("Task timeline calculation for:", task.title)
    console.log("Created date:", createdDate)
    console.log("Due date:", dueDate)
    console.log("Duration hours:", duration)

    // Calculate start and end positions relative to timeline
    const timelineStart = timelineDates[0]
    const timelineEnd = timelineDates[timelineDates.length - 1]

    console.log("Timeline start:", timelineStart)
    console.log("Timeline end:", timelineEnd)

    const taskStart = createdDate < timelineStart ? timelineStart : createdDate
    const taskEnd = dueDate > timelineEnd ? timelineEnd : dueDate

    console.log("Task start (adjusted):", taskStart)
    console.log("Task end (adjusted):", taskEnd)

    // Calculate position as percentage
    const totalTimelineWidth = timelineEnd.getTime() - timelineStart.getTime()
    const taskStartOffset = taskStart.getTime() - timelineStart.getTime()
    const taskDuration = taskEnd.getTime() - taskStart.getTime()

    console.log("Timeline width (ms):", totalTimelineWidth)
    console.log("Task start offset (ms):", taskStartOffset)
    console.log("Task duration (ms):", taskDuration)

    const leftPercent = (taskStartOffset / totalTimelineWidth) * 100
    const widthPercent = (taskDuration / totalTimelineWidth) * 100

    console.log("Left percent:", leftPercent)
    console.log("Width percent:", widthPercent)

    return {
      left: `${Math.max(0, leftPercent)}%`,
      width: `${Math.min(100 - Math.max(0, leftPercent), widthPercent)}%`,
      isVisible: taskEnd >= timelineStart && taskStart <= timelineEnd,
    }
  }

  const stats = getTaskStats()

  const getStatusConfig = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.default
  }

  const getPriorityConfig = (priority: string) => {
    return priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.low
  }

  const GanttTaskRow = ({ task, index }: { task: AITask; index: number }) => {
    const timelinePosition = getTaskTimelinePosition(task)
    const statusConf = getStatusConfig(task.status)
    const priorityConf = getPriorityConfig(task.priority)
    const PriorityIcon = priorityConf.icon

    console.log("Task status:", task.status, "Status config:", statusConf)

    return (
      <div
        className={`grid grid-cols-[400px_1fr] border-b border-zinc-700 hover:bg-zinc-800/50 transition-colors ${
          index % 2 === 0 ? "bg-zinc-900" : "bg-zinc-900/80"
        }`}
      >
        {/* Task Info Column - Made wider */}
        <div className="p-6 border-r border-zinc-700 flex items-center space-x-4">
          <div
            className={`w-4 h-4 rounded-full ${statusConf.color}`}
          ></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <PriorityIcon
                className={`w-4 h-4 ${priorityConf.textColor}`}
              />
              <span
                className={`text-sm px-3 py-1 rounded-full ${
                  priorityConf.bgColor
                } ${priorityConf.textColor} font-medium`}
              >
                {priorityConf.label}
              </span>
            </div>
            <h3
              className="font-semibold text-base text-zinc-200 truncate mb-1"
              title={task.title}
            >
              {task.title}
            </h3>
            <p
              className="text-sm text-zinc-400 truncate mb-2"
              title={task.description}
            >
              {task.description}
            </p>
            <div className="flex items-center space-x-4 text-sm text-zinc-500">
              <span className="flex items-center">
                <Timer className="w-4 h-4 mr-1" />
                {getDurationHours(task.estimated_duration_hours)}h
              </span>
              <span className="flex items-center">
                <User className="w-4 h-4 mr-1" />
                {task.created_by_agent || 'AI System'}
              </span>
            </div>
            <div className="flex items-center space-x-4 mt-2 text-xs text-zinc-600">
              <span>Created: {formatDate(task.created_at).toLocaleDateString()}</span>
              <span>Due: {formatDate(task.due_date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Timeline Column - Made taller */}
        <div className="relative p-6 min-h-[120px] flex items-center group">
          {timelinePosition.isVisible && (
            <div
              className={`absolute h-10 rounded-full ${
                statusConf.color
              } opacity-90 hover:opacity-100 transition-all cursor-pointer shadow-lg border-2 border-white/20`}
              style={{
                left: timelinePosition.left,
                width: timelinePosition.width,
                minWidth: "40px",
              }}
              title={`${task.title} - ${statusConf.label}
Created: ${formatDate(task.created_at).toLocaleDateString()}
Due: ${formatDate(task.due_date).toLocaleDateString()}`}            >
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-white/10 to-white/5"></div>
            </div>
          )}

          {/* Task action buttons - show on hover */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
            {task.status !== "in_progress" && (
              <button
                onClick={() => handleStatusChange(getTaskId(task), "in_progress")}
                disabled={isPending}
                className="px-3 py-1.5 text-sm bg-blue-700 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
                title="Start Progress"
              >
                Start
              </button>
            )}
            {task.status !== "completed" && (
              <button
                onClick={() => handleStatusChange(getTaskId(task), "completed")}
                disabled={isPending}
                className="px-3 py-1.5 text-sm bg-emerald-700 text-white rounded-md hover:bg-emerald-600 transition-colors disabled:opacity-50"
                title="Mark Done"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">My Tasks</h1>
        <p className="text-zinc-400 mt-1">Manage and track your assigned tasks</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total Tasks</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Target className="w-8 h-8 text-zinc-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-900/30 border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-300">In Progress</p>
                <p className="text-2xl font-bold text-white">
                  {stats.inProgress}
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-900/30 border-emerald-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-300">Completed</p>
                <p className="text-2xl font-bold text-white">
                  {stats.completed}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-900/30 border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-300">Productivity</p>
                <p className="text-2xl font-bold text-white">
                  {Math.round(stats.productivity)}%
                </p>
              </div>
              <CheckSquare className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-zinc-900/50 border-zinc-700">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600 focus:border-rose-600 bg-zinc-800 text-zinc-200 placeholder:text-zinc-500"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600 bg-zinc-800 text-zinc-200"
            >
              <option value="all">All Status</option>
              <option value="pending">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600 bg-zinc-800 text-zinc-200"
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Timeline/Gantt View */}
      <Card className="bg-zinc-900/50 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-rose-500" />
            Task Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Timeline Header */}
          <div className="grid grid-cols-[400px_1fr] border-b border-zinc-800 bg-zinc-800">
            <div className="p-6 border-r border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-200 text-lg">Tasks</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-zinc-400">
                  {currentWeekStart.toLocaleDateString()} - {new Date(currentWeekStart.getTime() + 13 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </span>
                <button
                  onClick={() => navigateWeek("prev")}
                  className="p-2 hover:bg-zinc-700 rounded transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-zinc-400" />
                </button>
                <button
                  onClick={() => navigateWeek("next")}
                  className="p-2 hover:bg-zinc-700 rounded transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-zinc-400" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-14 border-r border-zinc-800">
              {timelineDates.map((date, index) => (
                <div
                  key={index}
                  className="p-3 text-center border-r border-zinc-800 last:border-r-0 min-h-[80px] flex flex-col justify-center"
                >
                  <div className="text-sm text-zinc-400 font-medium mb-1">
                    {date.toLocaleDateString("en-US", { month: "short" })}
                  </div>
                  <div className="text-lg font-bold text-zinc-200 mb-1">
                    {date.getDate()}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Task Rows */}
          <div className="max-h-[600px] overflow-y-auto">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-16">
                <Target className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400 text-lg">No tasks found</p>
                <p className="text-zinc-500 text-sm">
                  Try adjusting your filters or check back later for new assignments
                </p>
              </div>
            ) : (
              <div>
                {filteredTasks.map((task, index) => (
                  <GanttTaskRow key={getTaskId(task)} task={task} index={index} />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading Overlay */}
      {isPending && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-800 rounded-lg p-6 flex items-center space-x-3 shadow-lg border border-zinc-700">
            <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
            <span className="text-zinc-300 font-medium">Updating task...</span>
          </div>
        </div>
      )}
    </div>
  )
}
