/**
 * Autonomous Mode - AI plans and executes multi-step tasks
 * Like Kiro's autonomous mode but FREE
 */

export class AutonomousEngine {
  constructor() {
    this.tasks = new Map(); // taskId -> task state
  }

  createTask(prompt, projectId) {
    const taskId = Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    const task = {
      id: taskId,
      prompt,
      projectId,
      status: 'planning', // planning, executing, completed, failed
      steps: [],
      currentStep: 0,
      files: [], // files to create/modify
      result: null,
      createdAt: new Date().toISOString(),
    };
    this.tasks.set(taskId, task);
    return task;
  }

  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  listTasks() {
    return [...this.tasks.values()].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  // Parse AI response to extract files
  parseFilesFromResponse(response) {
    const files = [];
    // Match ```language:filepath\ncontent\n```
    const filePattern = /```(\w+):([^\n]+)\n([\s\S]*?)```/g;
    let match;

    while ((match = filePattern.exec(response)) !== null) {
      files.push({
        language: match[1],
        path: match[2].trim(),
        content: match[3].trim(),
      });
    }

    // Also match standard code blocks with comments indicating filename
    if (files.length === 0) {
      const altPattern = /```(\w*)\n\/\/\s*([\w./\-]+)\n([\s\S]*?)```/g;
      while ((match = altPattern.exec(response)) !== null) {
        files.push({
          language: match[1] || 'text',
          path: match[2].trim(),
          content: match[3].trim(),
        });
      }
    }

    return files;
  }

  // Build the autonomous prompt
  buildPrompt(userRequest, existingFiles = []) {
    let prompt = `USER REQUEST: ${userRequest}\n\n`;

    if (existingFiles.length > 0) {
      prompt += `EXISTING PROJECT FILES:\n`;
      existingFiles.forEach(f => {
        prompt += `- ${f.path} (${f.type})\n`;
      });
      prompt += '\n';
    }

    prompt += `INSTRUCTIONS:
1. Analyze the request thoroughly
2. Plan what files need to be created/modified
3. Generate COMPLETE file contents (no placeholders, no TODOs)
4. Use the format: \`\`\`language:filepath for each file
5. After all files, explain what was done

Generate production-ready code now:`;

    return prompt;
  }

  updateTaskStatus(taskId, status, result = null) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = status;
      if (result) task.result = result;
      task.updatedAt = new Date().toISOString();
    }
    return task;
  }
}
