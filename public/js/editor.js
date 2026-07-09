class Editor {
  constructor(){this.currentFile=null;this.openFiles=new Map();this.activeTab=null;this.modified=new Set();this.init();}
  init(){this.editorEl=document.getElementById('code-editor');this.lineNumbersEl=document.getElementById('line-numbers');this.tabsEl=document.getElementById('tabs-list');this.containerEl=document.getElementById('editor-container');this.welcomeEl=document.getElementById('editor-welcome');this.bindEvents();}
  bindEvents(){
    this.editorEl.addEventListener('input',()=>{this.updateLineNumbers();this.updateCursorPosition();this.markModified();});
    this.editorEl.addEventListener('scroll',()=>{this.lineNumbersEl.scrollTop=this.editorEl.scrollTop;});
    this.editorEl.addEventListener('keyup',()=>this.updateCursorPosition());
    this.editorEl.addEventListener('click',()=>this.updateCursorPosition());
    this.editorEl.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const s=this.editorEl.selectionStart;const end=this.editorEl.selectionEnd;this.editorEl.value=this.editorEl.value.substring(0,s)+'  '+this.editorEl.value.substring(end);this.editorEl.selectionStart=this.editorEl.selectionEnd=s+2;this.updateLineNumbers();}});
    document.getElementById('save-file-btn')?.addEventListener('click',()=>this.saveCurrentFile());
  }
  openFile(filePath,content){
    this.openFiles.set(filePath,content);this.currentFile=filePath;this.activeTab=filePath;
    this.welcomeEl.style.display='none';this.containerEl.style.display='flex';
    this.editorEl.value=content;this.updateLineNumbers();
    document.getElementById('editor-filename').textContent=filePath;
    document.getElementById('editor-language').textContent=this.getLanguage(filePath.split('/').pop());
    this.renderTabs();this.updateCursorPosition();document.getElementById('file-status').textContent='Ready';
  }
  closeFile(filePath){
    this.openFiles.delete(filePath);this.modified.delete(filePath);
    if(this.activeTab===filePath){const f=[...this.openFiles.keys()];if(f.length>0)this.switchToFile(f[f.length-1]);else this.showWelcome();}
    this.renderTabs();
  }
  switchToFile(filePath){
    if(this.activeTab&&this.openFiles.has(this.activeTab))this.openFiles.set(this.activeTab,this.editorEl.value);
    const content=this.openFiles.get(filePath);if(content!==undefined){this.currentFile=filePath;this.activeTab=filePath;this.editorEl.value=content;this.updateLineNumbers();document.getElementById('editor-filename').textContent=filePath;document.getElementById('editor-language').textContent=this.getLanguage(filePath.split('/').pop());this.renderTabs();}
  }
  showWelcome(){this.containerEl.style.display='none';this.welcomeEl.style.display='flex';this.currentFile=null;this.activeTab=null;}
  renderTabs(){
    this.tabsEl.innerHTML='';
    this.openFiles.forEach((c,fp)=>{const fn=fp.split('/').pop();const tab=document.createElement('button');tab.className=`tab ${fp===this.activeTab?'active':''}`;tab.innerHTML=`<span>${this.modified.has(fp)?'● ':''}${fn}</span><span class="close-tab" data-path="${fp}">&times;</span>`;
    tab.addEventListener('click',e=>{if(e.target.classList.contains('close-tab'))this.closeFile(e.target.dataset.path);else this.switchToFile(fp);});this.tabsEl.appendChild(tab);});
  }
  async saveCurrentFile(){
    if(!this.currentFile||!window.app?.currentProject)return;
    this.openFiles.set(this.currentFile,this.editorEl.value);
    try{document.getElementById('file-status').textContent='Saving...';
    const r=await fetch('/api/files',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:window.app.currentProject,filePath:this.currentFile,content:this.editorEl.value})});
    if(r.ok){this.modified.delete(this.currentFile);this.renderTabs();document.getElementById('file-status').textContent='Saved';setTimeout(()=>document.getElementById('file-status').textContent='Ready',2000);}
    }catch(e){document.getElementById('file-status').textContent='Save failed';}
  }
  markModified(){if(this.currentFile){this.modified.add(this.currentFile);this.renderTabs();document.getElementById('file-status').textContent='Modified';}}
  updateLineNumbers(){const lines=this.editorEl.value.split('\n').length;this.lineNumbersEl.innerHTML=Array.from({length:lines},(_,i)=>`<div>${i+1}</div>`).join('');}
  updateCursorPosition(){const pos=this.editorEl.selectionStart;const text=this.editorEl.value.substring(0,pos);const lines=text.split('\n');document.getElementById('cursor-position').textContent=`Ln ${lines.length}, Col ${lines[lines.length-1].length+1}`;}
  getLanguage(fn){const ext=fn.split('.').pop()?.toLowerCase();const m={js:'JavaScript',jsx:'React JSX',ts:'TypeScript',tsx:'React TSX',py:'Python',html:'HTML',css:'CSS',json:'JSON',md:'Markdown'};return m[ext]||ext?.toUpperCase()||'Text';}
}
window.editor=new Editor();
