/**
 * Project Card Component
 *
 * Displays project summary with completion progress and quick actions.
 */

import { useState } from 'react';
import { MoreVertical, Archive, Pencil, Trash2, ArchiveRestore } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';
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
import { useArchiveProject, useUnarchiveProject, useDeleteProject } from '@/hooks/useTodos';
import { ProjectFormDialog } from './ProjectFormDialog';
import { Shimmer } from '@/components/magicui/shimmer';
import type { Project } from '@/types/todo';

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const archiveMutation = useArchiveProject();
  const unarchiveMutation = useUnarchiveProject();
  const deleteMutation = useDeleteProject();

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (project.isArchived) {
      unarchiveMutation.mutate(project.id);
    } else {
      archiveMutation.mutate(project.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditDialogOpen(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(project.id, {
      onSuccess: () => setIsDeleteDialogOpen(false),
    });
  };

  return (
    <>
      <Card
        className="group cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] relative overflow-hidden"
        onClick={onClick}
        style={{
          borderTopColor: project.color,
          borderTopWidth: '4px',
        }}
      >
        {/* Shimmer effect on hover */}
        <Shimmer className="opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{project.name}</h3>
              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{project.description}</p>
              )}
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
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
                <DropdownMenuItem onClick={handleEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleArchive}>
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
                <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pb-4">
          {/* Stats */}
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              {project.completedCount} of {project.itemCount} tasks
            </span>
            <span className="font-medium">{project.completionPercentage}%</span>
          </div>

          {/* Progress Bar */}
          <Progress value={project.completionPercentage} className="h-2" />

          {/* Archived Badge */}
          {project.isArchived && (
            <div className="mt-3">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium">
                <Archive className="h-3 w-3" />
                Archived
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <ProjectFormDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} project={project} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{project.name}"? This will also delete all lists and items within this
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
    </>
  );
}
