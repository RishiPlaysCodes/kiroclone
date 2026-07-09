/**
 * Autonomous Engine v2 - Multi-Step Project Builder
 * 
 * How it works (like Kiro):
 * 1. User says "Build an e-commerce app"
 * 2. AI creates a PLAN (list of files needed)
 * 3. AI generates each file ONE BY ONE (avoids token limits)
 * 4. All files saved to project
 * 5. User gets complete project with 20-50+ files
 */

export class AutonomousEngine {
  constructor() {
    this.tasks = new Map();
  }

  createTask(prompt, projectId) {
    const taskId = Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    const task = {
      id: taskId,
      prompt,
      projectId,
      status: 'idle',
      plan: [],        // file plan from AI
      completed: [],   // files already generated
      failed: [],      // files that failed
      currentFile: null,
      progress: 0,
      totalFiles: 0,
      createdAt: new Date().toISOString(),
    };
    this.tasks.set(taskId, task);
    return task;
  }

  getTask(taskId) { return this.tasks.get(taskId); }

  // Step 1: Get AI to create a plan
  getPlanPrompt(userRequest) {
    return `You are a project planner. The user wants: "${userRequest}"

List ALL files needed for a COMPLETE, production-ready project.

RESPOND ONLY with a JSON array of objects, nothing else:
[
  {"path": "index.html", "desc": "Main HTML page with full structure"},
  {"path": "css/style.css", "desc": "Complete styles"},
  {"path": "js/app.js", "desc": "Main JavaScript logic"}
]

IMPORTANT RULES:
- ONLY include code files: .html, .css, .js, .json, .py, .ts, .jsx, .md
- NEVER include image files (.jpg, .png, .gif, .svg, .ico)
- NEVER include font files (.ttf, .woff, .woff2)
- NEVER include binary files
- Use CSS for icons/graphics (emoji, unicode, or CSS shapes)
- Use placeholder colors/gradients instead of images
- Keep it between 4-15 files maximum
- Use simple flat structure (not too deeply nested)
- Only output the JSON array, no explanation`;
  }

  // Step 2: Get AI to generate one specific file
  getFilePrompt(userRequest, filePath, fileDesc, existingFiles) {
    let context = '';
    if (existingFiles.length > 0) {
      context = `\nAlready created files: ${existingFiles.map(f => f.path).join(', ')}\n`;
    }

    return `Project: "${userRequest}"${context}
Generate the COMPLETE content for: ${filePath}
Description: ${fileDesc}

CRITICAL RULES:
- Output ONLY the raw file content, NO explanations, NO markdown code blocks
- Write COMPLETE, WORKING, PRODUCTION-READY code with REAL content (not lorem ipsum)
- Use REAL text content (not placeholder text)
- For CSS: Include proper responsive design, animations, colors, layout
- For HTML: Include complete structure with all sections fully built out
- For JS: Include full interactivity and functionality
- Do NOT reference external images - use CSS gradients, emojis, or unicode symbols
- Do NOT use placeholder text like "Lorem ipsum" - write real meaningful content
- Make it VISUALLY IMPRESSIVE with modern design

Output the file content now:`;
  }

  // Parse plan from AI response
  parsePlan(response) {
    try {
      // Try to extract JSON from response
      let jsonStr = response.trim();
      
      // If wrapped in code blocks, extract
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
      if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();
      
      // Find JSON array in response
      const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (arrayMatch) jsonStr = arrayMatch[0];

      const plan = JSON.parse(jsonStr);
      if (Array.isArray(plan) && plan.length > 0 && plan[0].path) {
        return plan;
      }
    } catch (e) {
      // Fallback: try line-by-line parsing
      const lines = response.split('\n').filter(l => l.includes('.'));
      if (lines.length > 0) {
        return lines.slice(0, 20).map(l => {
          const clean = l.replace(/^[-*\d.)\s]+/, '').trim();
          const parts = clean.split(/\s*[-–:]\s*/);
          return { path: parts[0]?.replace(/["`']/g, '').trim(), desc: parts[1] || '' };
        }).filter(f => f.path && f.path.includes('.'));
      }
    }
    return [];
  }

  // Parse file from AI - just returns the content directly
  parseFileContent(response, filePath) {
    let content = response.trim();
    
    // Remove markdown code blocks if AI wrapped it
    const codeBlock = content.match(/```\w*\n([\s\S]*?)```/);
    if (codeBlock) content = codeBlock[1].trim();
    
    // Remove any "Here's the file:" type prefixes
    const lines = content.split('\n');
    if (lines[0] && !lines[0].includes('{') && !lines[0].includes('<') && 
        !lines[0].includes('import') && !lines[0].includes('//') &&
        !lines[0].includes('#') && !lines[0].includes('const') &&
        !lines[0].includes('export') && !lines[0].includes('from') &&
        !lines[0].includes('def ') && !lines[0].includes('class ') &&
        lines[0].length < 100 && lines.length > 3) {
      // First line might be an explanation, check if second line looks like code
      if (lines[1]?.match(/^[{<\/#*import\s]/)) {
        content = lines.slice(1).join('\n');
      }
    }
    
    return content;
  }

  updateTask(taskId, updates) {
    const task = this.tasks.get(taskId);
    if (task) Object.assign(task, updates, { updatedAt: new Date().toISOString() });
    return task;
  }
}
