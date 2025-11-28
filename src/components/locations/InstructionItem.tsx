"use client";

/**
 * Instruction Item Component
 * Displays a single instruction with media count and actions
 */

import { Edit, Trash2, Image as ImageIcon, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Instruction } from "@/lib/types/instructions";

interface InstructionItemProps {
  instruction: Instruction;
  onEdit: () => void;
  onDelete: () => void;
}

export function InstructionItem({ instruction, onEdit, onDelete }: InstructionItemProps) {
  const imageCount = instruction.imageUrls?.length || 0;
  const videoCount = instruction.videoUrls?.length || 0;
  const totalMedia = imageCount + videoCount;

  return (
    <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-500 min-w-[24px]">
            {instruction.stepNumber}.
          </span>
          <span className="font-medium">{instruction.title}</span>
        </div>
        <p className="text-sm text-gray-600 mt-1 ml-7">{instruction.description}</p>
        {instruction.room && (
          <p className="text-xs text-gray-500 mt-1 ml-7">Room: {instruction.room}</p>
        )}
        {totalMedia > 0 && (
          <div className="flex items-center gap-3 mt-2 ml-7 text-xs text-gray-500">
            {imageCount > 0 && (
              <span className="flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                {imageCount} image{imageCount !== 1 ? "s" : ""}
              </span>
            )}
            {videoCount > 0 && (
              <span className="flex items-center gap-1">
                <Video className="h-3 w-3" />
                {videoCount} video{videoCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-2 ml-4">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit className="h-3 w-3 mr-1" />
          Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );
}

