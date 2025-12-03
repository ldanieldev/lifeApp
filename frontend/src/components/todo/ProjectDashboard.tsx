/**
 * Project Dashboard Component
 *
 * Displays grid of project cards with filtering and search.
 * Main entry point for todo application.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Plus, Archive, Search, LayoutGrid, MoreVertical, Pencil, Trash2, ArchiveRestore } from 'lucide-react';
import { useProjects, useDeleteProject, useArchiveProject, useUnarchiveProject } from '@/hooks/useTodos';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { BentoGrid, BentoGridItem, BentoGridSkeleton } from '@/components/magicui/bento-grid';
import { Progress } from '@/components/shadcn/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/shadcn/alert-dialog';
import { ProjectFormDialog } from './ProjectFormDialog';
import type { Project } from '@/types/todo';

export function ProjectDashboard() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '/todo/projects/' });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.search || '');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null);

  // Fetch projects
  const { data: projectsData, isLoading } = useProjects({
    isArchived: searchParams.archived,
    search: searchParams.search,
    ordering: 'displayOrder',
  });

  const archiveMutation = useArchiveProject();
  const unarchiveMutation = useUnarchiveProject();
  const deleteMutation = useDeleteProject();

  const projects = projectsData?.results || [];

  const handleProjectClick = (project: Project) => {
    navigate({ to: '/todo/projects/$projectId', params: { projectId: String(project.id) } });
  };

  const handleArchive = (project: Project) => {
    if (project.isArchived) {
      unarchiveMutation.mutate(project.id);
    } else {
      archiveMutation.mutate(project.id);
    }
  };

  const handleDeleteProject = (projectId: number) => {
    setDeletingProjectId(projectId);
  };

  const confirmDelete = () => {
    if (deletingProjectId) {
      deleteMutation.mutate(deletingProjectId, {
        onSuccess: () => setDeletingProjectId(null),
      });
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // Debounced search update via URL params
    const timer = setTimeout(() => {
      navigate({
        to: '/todo/projects',
        search: (prev) => ({ ...prev, search: value || undefined }),
        replace: true,
      });
    }, 300);
    return () => clearTimeout(timer);
  };

  const toggleArchived = () => {
    navigate({
      to: '/todo/projects',
      search: (prev) => ({
        ...prev,
        archived: prev.archived ? undefined : true,
      }),
      replace: true,
    });
  };

  return (
    <motion.div
      className="container mx-auto py-8 px-4 max-w-7xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your todo lists and tasks</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <Button variant={searchParams.archived ? 'default' : 'outline'} onClick={toggleArchived}>
          <Archive className="h-4 w-4 mr-2" />
          {searchParams.archived ? 'Hide' : 'Show'} Archived
        </Button>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <BentoGridSkeleton count={6} />
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <LayoutGrid className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            {searchParams.search
              ? 'No projects match your search. Try a different query.'
              : 'Get started by creating your first project to organize your tasks.'}
          </p>
          {!searchParams.search && (
            <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          )}
        </div>
      ) : (
        <BentoGrid>
          {projects.map((project) => (
            <BentoGridItem
              key={project.id}
              onClick={() => handleProjectClick(project)}
              title={
                <div className="flex items-center gap-2">
                  <span>{project.name}</span>
                  {/* Subtle color indicator */}
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color }}
                    title={`Project color: ${project.color}`}
                  />
                </div>
              }
              description={project.description || `${project.completedCount} of ${project.itemCount} tasks completed`}
              actions={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingProject(project)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleArchive(project)}>
                      {project.isArchived ? (
                        <>
                          <ArchiveRestore className="h-4 w-4 mr-2" />
                          Unarchive
                        </>
                      ) : (
                        <>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteProject(project.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            >
              {/* Progress Section */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{project.completionPercentage}%</span>
                </div>
                <Progress value={project.completionPercentage} className="h-2" />
              </div>

              {/* Archived Badge */}
              {project.isArchived && (
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium">
                    <Archive className="h-3 w-3" />
                    Archived
                  </span>
                </div>
              )}
            </BentoGridItem>
          ))}
        </BentoGrid>
      )}

      {/* Create Project Dialog */}
      <ProjectFormDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />

      {/* Edit Project Dialog */}
      {editingProject && (
        <ProjectFormDialog
          open={!!editingProject}
          onOpenChange={(open) => !open && setEditingProject(null)}
          project={editingProject}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingProjectId} onOpenChange={(open) => !open && setDeletingProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This will also delete all lists and items within this
              project. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
