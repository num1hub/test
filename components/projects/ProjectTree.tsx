'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ProjectTreeNode } from '@/types/project';

interface TreeNodeProps {
  node: ProjectTreeNode;
  level: number;
}

function TreeNode({ node, level }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const displayName = node.metadata.name ?? node.metadata.capsule_id;

  return (
    <div className="select-none">
      <div
        className="flex cursor-pointer items-center rounded px-2 py-2 transition-colors hover:bg-slate-800/50"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => setExpanded((prev) => !prev)}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="mr-2 h-4 w-4 shrink-0 text-amber-500" />
          ) : (
            <ChevronRight className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
          )
        ) : (
          <span className="mr-2 h-4 w-4" />
        )}

        <Link
          href={`/projects/${encodeURIComponent(node.metadata.capsule_id)}`}
          className="flex-1 text-slate-300 transition-colors hover:text-amber-500"
          onClick={(event) => event.stopPropagation()}
        >
          <span className="font-medium">{displayName}</span>
          <span className="ml-3 text-xs text-slate-500">{node.metadata.status}</span>
          {hasChildren && <span className="ml-2 text-xs text-slate-600">({node.children.length})</span>}
        </Link>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.metadata.capsule_id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ProjectTreeProps {
  tree: ProjectTreeNode[];
}

export default function ProjectTree({ tree }: ProjectTreeProps) {
  if (tree.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-500">
        No projects found.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      {tree.map((root) => (
        <TreeNode key={root.metadata.capsule_id} node={root} level={0} />
      ))}
    </div>
  );
}
