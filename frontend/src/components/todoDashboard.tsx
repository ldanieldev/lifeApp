import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Checkbox } from '@/components/shadcn/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/shadcn/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Progress } from '@/components/shadcn/progress';
import { ScrollArea } from '@/components/shadcn/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { Textarea } from '@/components/shadcn/textarea';
import {
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  FilterIcon,
  FlagIcon,
  ListTodoIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  TargetIcon,
  Trash2Icon,
  TrendingUpIcon,
  XIcon,
} from 'lucide-react';
import React, { useState, type ReactNode } from 'react';

// Type definitions
type Priority = 'high' | 'medium' | 'low';
type ListColor = 'blue' | 'green' | 'purple' | 'orange' | 'pink';
type ActiveView = 'overview' | 'today' | 'lists';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  priority: Priority;
  dueDate: string;
}

interface TodoList {
  id: number;
  name: string;
  description: string;
  color: ListColor;
  todos: Todo[];
}

interface ExtendedTodo extends Todo {
  listName: string;
  listColor: ListColor;
}

interface ListStats {
  completed: number;
  total: number;
  percentage: number;
}

interface OverallStats extends ListStats {
  highPriority: number;
}

interface ColorVariant {
  bg: string;
  border: string;
  dot: string;
}

interface ViewHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
}

interface TodoItemProps {
  todo: Todo | ExtendedTodo;
  showList?: boolean;
  compact?: boolean;
}

// Helper components defined outside to avoid recreation on each render
const ViewHeader: React.FC<ViewHeaderProps> = ({ title, description, children }) => (
  <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
    <div>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
    {children}
  </div>
);

const StatCard: React.FC<StatCardProps> = ({ title, value, description, icon: Icon, trend }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">{title}</p>
          <div className="flex items-center space-x-2">
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <Badge variant="secondary" className="text-xs">
                {trend}
              </Badge>
            )}
          </div>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
    </CardContent>
  </Card>
);

const TodoDashboard: React.FC = () => {
  const [lists, setLists] = useState<TodoList[]>([
    {
      id: 1,
      name: 'Work Tasks',
      description: 'Professional responsibilities',
      color: 'blue',
      todos: [
        { id: 1, text: 'Review quarterly reports', completed: false, priority: 'high', dueDate: '2025-08-25' },
        { id: 2, text: 'Schedule team meeting', completed: true, priority: 'medium', dueDate: '2025-08-22' },
        { id: 3, text: 'Update project documentation', completed: false, priority: 'low', dueDate: '2025-08-28' },
      ],
    },
    {
      id: 2,
      name: 'Personal',
      description: 'Daily life and goals',
      color: 'green',
      todos: [
        { id: 4, text: 'Buy groceries', completed: false, priority: 'medium', dueDate: '2025-08-23' },
        { id: 5, text: 'Call dentist for appointment', completed: false, priority: 'high', dueDate: '2025-08-24' },
        { id: 6, text: 'Finish reading book', completed: false, priority: 'low', dueDate: '2025-08-30' },
      ],
    },
    {
      id: 3,
      name: 'Shopping',
      description: 'Items to purchase',
      color: 'purple',
      todos: [
        { id: 7, text: 'New laptop', completed: false, priority: 'high', dueDate: '2025-08-26' },
        { id: 8, text: 'Birthday gift', completed: false, priority: 'medium', dueDate: '2025-08-29' },
      ],
    },
  ]);

  const [activeList, setActiveList] = useState<number>(1);
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [newTodo, setNewTodo] = useState<string>('');
  const [newTodoPriority, setNewTodoPriority] = useState<Priority>('medium');
  const [newTodoDueDate, setNewTodoDueDate] = useState<string>('');
  const [newListName, setNewListName] = useState<string>('');
  const [newListDescription, setNewListDescription] = useState<string>('');
  const [newListColor, setNewListColor] = useState<ListColor>('blue');
  const [isAddingList, setIsAddingList] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const priorityColors: Record<Priority, 'destructive' | 'default' | 'secondary'> = {
    high: 'destructive',
    medium: 'default',
    low: 'secondary',
  };

  const colorVariants: Record<ListColor, ColorVariant> = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' },
    green: { bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-500' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', dot: 'bg-purple-500' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500' },
    pink: { bg: 'bg-pink-50', border: 'border-pink-200', dot: 'bg-pink-500' },
  };

  const addTodo = (): void => {
    if (!newTodo.trim()) return;

    const newTodoItem: Todo = {
      id: Date.now(),
      text: newTodo,
      completed: false,
      priority: newTodoPriority,
      dueDate: newTodoDueDate,
    };

    setLists(lists.map((list) => (list.id === activeList ? { ...list, todos: [...list.todos, newTodoItem] } : list)));

    setNewTodo('');
    setNewTodoPriority('medium');
    setNewTodoDueDate('');
  };

  const toggleTodo = (todoId: number): void => {
    setLists(
      lists.map((list) =>
        list.id === activeList
          ? {
              ...list,
              todos: list.todos.map((todo) => (todo.id === todoId ? { ...todo, completed: !todo.completed } : todo)),
            }
          : list
      )
    );
  };

  const deleteTodo = (todoId: number): void => {
    setLists(
      lists.map((list) =>
        list.id === activeList ? { ...list, todos: list.todos.filter((todo) => todo.id !== todoId) } : list
      )
    );
  };

  const addList = (): void => {
    if (!newListName.trim()) return;

    const newList: TodoList = {
      id: Date.now(),
      name: newListName,
      description: newListDescription,
      color: newListColor,
      todos: [],
    };

    setLists([...lists, newList]);
    setNewListName('');
    setNewListDescription('');
    setNewListColor('blue');
    setIsAddingList(false);
  };

  const deleteList = (listId: number): void => {
    if (lists.length === 1) return;
    setLists(lists.filter((list) => list.id !== listId));
    if (activeList === listId) {
      setActiveList(lists.find((list) => list.id !== listId)?.id || lists[0].id);
    }
  };

  const getCurrentList = (): TodoList | undefined => lists.find((list) => list.id === activeList);
  const currentList = getCurrentList();

  const getListStats = (list: TodoList): ListStats => {
    const completed = list.todos.filter((todo) => todo.completed).length;
    const total = list.todos.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  };

  const getOverallStats = (): OverallStats => {
    const allTodos = lists.flatMap((list) => list.todos);
    const completed = allTodos.filter((todo) => todo.completed).length;
    const total = allTodos.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const highPriority = allTodos.filter((todo) => todo.priority === 'high' && !todo.completed).length;
    return { completed, total, percentage, highPriority };
  };

  const getTodaysTasks = (): ExtendedTodo[] => {
    const today = new Date().toISOString().split('T')[0];
    return lists.flatMap((list) =>
      list.todos
        .filter((todo) => todo.dueDate === today && !todo.completed)
        .map((todo) => ({ ...todo, listName: list.name, listColor: list.color }))
    );
  };

  const getUpcomingTasks = (): ExtendedTodo[] => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return lists.flatMap((list) =>
      list.todos
        .filter((todo) => {
          if (!todo.dueDate || todo.completed) return false;
          const dueDate = new Date(todo.dueDate);
          return dueDate > today && dueDate <= nextWeek;
        })
        .map((todo) => ({ ...todo, listName: list.name, listColor: list.color }))
    );
  };

  const getFilteredTodos = (): Todo[] => {
    if (!currentList) return [];
    if (!searchQuery.trim()) return currentList.todos;

    return currentList.todos.filter((todo) => todo.text.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const overallStats = getOverallStats();
  const todaysTasks = getTodaysTasks();
  const upcomingTasks = getUpcomingTasks();
  const filteredTodos = getFilteredTodos();

  const TodoItem: React.FC<TodoItemProps> = ({ todo, showList = false, compact = false }) => {
    const isExtendedTodo = (t: Todo | ExtendedTodo): t is ExtendedTodo => {
      return 'listName' in t && 'listColor' in t;
    };

    return (
      <div
        className={`flex items-center space-x-3 ${compact ? 'py-2' : 'py-3'} px-4 hover:bg-accent rounded-md transition-colors`}
      >
        <Checkbox checked={todo.completed} onCheckedChange={() => toggleTodo(todo.id)} className="shrink-0" />
        <div className="flex-1 min-w-0">
          <div className={`flex items-center gap-2 ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
            <span className="truncate text-sm">{todo.text}</span>
            <div className="flex items-center gap-1 shrink-0">
              {showList && isExtendedTodo(todo) && (
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${colorVariants[todo.listColor]?.dot}`} />
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    {todo.listName}
                  </Badge>
                </div>
              )}
              <Badge variant={priorityColors[todo.priority]} className="text-xs px-1.5 py-0">
                {todo.priority}
              </Badge>
              {todo.dueDate && (
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {new Date(todo.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Badge>
              )}
            </div>
          </div>
        </div>
        {!compact && (
          <Button variant="ghost" size="sm" className="shrink-0 h-8 w-8 p-0" onClick={() => deleteTodo(todo.id)}>
            <Trash2Icon className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="text-lg font-semibold">Todo Lists</h1>
          <p className="text-xs text-muted-foreground">Organize your tasks efficiently</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FilterIcon className="h-4 w-4 mr-1" />
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setActiveView('overview')}>
                <TargetIcon className="h-4 w-4 mr-2" />
                Overview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveView('today')}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                Today
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveView('lists')}>
                <ListTodoIcon className="h-4 w-4 mr-2" />
                All Lists
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={isAddingList} onOpenChange={setIsAddingList}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusIcon className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New List</DialogTitle>
                <DialogDescription>Add a new todo list to organize your tasks.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="list-name">Name</Label>
                  <Input
                    id="list-name"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="Enter list name..."
                  />
                </div>
                <div>
                  <Label htmlFor="list-description">Description</Label>
                  <Textarea
                    id="list-description"
                    value={newListDescription}
                    onChange={(e) => setNewListDescription(e.target.value)}
                    placeholder="Enter list description..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="list-color">Color</Label>
                  <Select value={newListColor} onValueChange={(value: ListColor) => setNewListColor(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                      <SelectItem value="purple">Purple</SelectItem>
                      <SelectItem value="orange">Orange</SelectItem>
                      <SelectItem value="pink">Pink</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingList(false)}>
                  Cancel
                </Button>
                <Button onClick={addList}>Create List</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-6">
            {activeView === 'overview' && (
              <>
                <ViewHeader title="Overview" description="Your productivity at a glance" />

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <StatCard
                    title="Total Progress"
                    value={`${overallStats.percentage}%`}
                    description={`${overallStats.completed}/${overallStats.total} completed`}
                    icon={TrendingUpIcon}
                  />
                  <StatCard
                    title="Due Today"
                    value={todaysTasks.length}
                    description="Tasks requiring attention"
                    icon={CalendarIcon}
                  />
                  <StatCard
                    title="High Priority"
                    value={overallStats.highPriority}
                    description="Urgent tasks remaining"
                    icon={FlagIcon}
                  />
                  <StatCard
                    title="Active Lists"
                    value={lists.length}
                    description="Categories in use"
                    icon={ListTodoIcon}
                  />
                </div>

                {/* Quick Lists Overview */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Your Lists</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {lists.map((list) => {
                      const stats = getListStats(list);
                      const colors = colorVariants[list.color];
                      return (
                        <Card
                          key={list.id}
                          className={`${colors.bg} ${colors.border} cursor-pointer hover:shadow-md transition-all ${
                            activeList === list.id ? 'ring-2 ring-ring ring-offset-2' : ''
                          }`}
                          onClick={() => {
                            setActiveList(list.id);
                            setActiveView('lists');
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
                                <h4 className="font-medium text-sm text-primary">{list.name}</h4>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {stats.total}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{list.description}</p>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span>
                                  {stats.completed} of {stats.total}
                                </span>
                                <span>{stats.percentage}%</span>
                              </div>
                              <Progress value={stats.percentage} className="h-2" />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Today's Tasks */}
                {todaysTasks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Due Today
                    </h3>
                    <Card>
                      <CardContent className="p-0">
                        {todaysTasks.map((todo) => (
                          <TodoItem key={todo.id} todo={todo} showList compact />
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            )}

            {activeView === 'today' && (
              <>
                <ViewHeader title="Today's Focus" description="Tasks that need your attention today" />

                <div className="space-y-4">
                  {todaysTasks.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <CheckCircle2Icon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No tasks due today! Great work! 🎉</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          Due Today ({todaysTasks.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        {todaysTasks.map((todo) => (
                          <TodoItem key={todo.id} todo={todo} showList />
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {upcomingTasks.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <ClockIcon className="h-4 w-4" />
                          This Week ({upcomingTasks.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        {upcomingTasks.map((todo) => (
                          <TodoItem key={todo.id} todo={todo} showList />
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            )}

            {activeView === 'lists' && currentList && (
              <>
                <ViewHeader title={currentList.name} description={currentList.description}>
                  <div className="flex items-center gap-2">
                    <Select value={activeList.toString()} onValueChange={(value) => setActiveList(parseInt(value))}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {lists.map((list) => (
                          <SelectItem key={list.id} value={list.id.toString()}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${colorVariants[list.color]?.dot}`} />
                              {list.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => deleteList(currentList.id)}>
                          <Trash2Icon className="h-4 w-4 mr-2" />
                          Delete List
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </ViewHeader>

                {/* Add Todo Form */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="relative">
                      <Input
                        placeholder="Add a new task..."
                        value={newTodo}
                        onChange={(e) => setNewTodo(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                        className="pr-20"
                      />
                      <Button size="sm" onClick={addTodo} className="absolute right-1 top-1 h-8">
                        <PlusIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Select value={newTodoPriority} onValueChange={(value: Priority) => setNewTodoPriority(value)}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High Priority</SelectItem>
                          <SelectItem value="medium">Medium Priority</SelectItem>
                          <SelectItem value="low">Low Priority</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="date"
                        value={newTodoDueDate}
                        onChange={(e) => setNewTodoDueDate(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Search */}
                {currentList.todos.length > 0 && (
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-8 w-8 p-0"
                        onClick={() => setSearchQuery('')}
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}

                {/* Todo List */}
                {filteredTodos.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <ListTodoIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? 'No tasks match your search' : 'No tasks yet. Add one above!'}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      {filteredTodos.map((todo) => (
                        <TodoItem key={todo.id} todo={todo} />
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default TodoDashboard;
