import re

with open('client/src/stages/TransformStage.tsx', 'r') as f:
    content = f.read()

# Add imports
import_insert_pos = content.find('import { usePortal } from "@/context/PortalContext";')
if import_insert_pos != -1:
    content = content[:import_insert_pos] + 'import { CardSkeleton } from "@/components/ui/skeleton";\nimport { Feedback } from "@/components/ui/feedback";\n' + content[import_insert_pos:]

# Replace Loading State
loading_pattern = r'\{isLoading \?\s*\(\s*<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">\s*\{Array\.from\(\{ length: 6 \}\)\.map\(\(\_, i\) => \(\s*<Card key=\{i\} className="animate-pulse">\s*<CardHeader>\s*<div className="h-4 bg-muted rounded w-2/3" />\s*<div className="h-3 bg-muted rounded w-full mt-2" />\s*</CardHeader>\s*<CardContent>\s*<div className="h-3 bg-muted rounded w-1/2" />\s*</CardContent>\s*</Card>\s*\)\)\}\s*</div>\s*\)'

replacement_loading = r'''{isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )'''

content = re.sub(loading_pattern, replacement_loading, content)

# Replace Error State
error_pattern = r': isError \?\s*\(\s*<div className="flex flex-col items-center justify-center py-20 gap-4 text-center">\s*<p className="text-muted-foreground">Failed to load projects\.</p>\s*<Button variant="outline" onClick=\{\(\) => refetch\(\)\} className="gap-2">\s*<RefreshCw className="h-4 w-4" />\s*Retry\s*</Button>\s*</div>\s*\)'

replacement_error = r''': isError ? (
        <Feedback
          type="error"
          title="Failed to load projects"
          action={<Button variant="outline" onClick={() => refetch()} className="gap-2"><RefreshCw className="h-4 w-4" />Retry</Button>}
        />
      )'''

content = re.sub(error_pattern, replacement_error, content)

# Replace Empty State
empty_pattern = r': filtered\.length === 0 \?\s*\(\s*<div className="flex flex-col items-center justify-center py-20 gap-4 text-center">\s*<Zap className="h-12 w-12 text-muted-foreground/40" />\s*<div className="space-y-1">\s*<p className="font-medium">No projects found</p>\s*<p className="text-sm text-muted-foreground">\s*\{\s*search \|\| activeCategory !== "all"\s*\?\s*"Try adjusting your search or filters\."\s*:\s*"Create your first project to get started\."\s*\}\s*</p>\s*</div>\s*\{!search && activeCategory === "all" && \(\s*<Button className="gap-2">\s*<Plus className="h-4 w-4" />\s*New project\s*</Button>\s*\)\}\s*</div>\s*\)'

replacement_empty = r''': filtered.length === 0 ? (
        <Feedback
          type="empty"
          title="No projects found"
          description={search || activeCategory !== "all" ? "Try adjusting your search or filters." : "Create your first project to get started."}
          action={!search && activeCategory === "all" ? <Button className="gap-2"><Plus className="h-4 w-4" />New project</Button> : null}
        />
      )'''

content = re.sub(empty_pattern, replacement_empty, content)

with open('client/src/stages/TransformStage.tsx', 'w') as f:
    f.write(content)
