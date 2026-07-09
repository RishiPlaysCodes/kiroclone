class FileExplorer {
  constructor(){this.projectId=null;this.files=[];this.init();}
  init(){this.treeEl=document.getElementById('file-tree');this.bindEvents();}
  bindEvents(){
    document.getElementById('new-file-btn')?.addEventListener('click',()=>this.promptNewFile());
    document.getElementById('new-folder-btn')?.addEventListener('click',()=>this.promptNewFolder());
  }
  async loadFiles(projectId){
    this.projectId=projectId;
    try{const r=await fetch(`/api/files?projectId=${projectId}`);const d=await r.json();this.files=d.files||[];this.renderTree();}
    catch(e){this.treeEl.innerHTML='<div class="empty-state"><p>Failed to load files</p></div>';}
  }
  renderTree(){
    if(this.files.length===0){this.treeEl.innerHTML='<div class="empty-state"><p>No files yet</p><button class="btn btn-sm btn-primary" onclick="window.fileExplorer.promptNewFile()">Create File</button></div>';return;}
    this.treeEl.innerHTML=this.renderItems(this.files,0);this.bindTreeEvents();
  }
  renderItems(items,depth){
    return items.map(item=>{
      if(item.type==='directory'){return `<div class="tree-node" data-path="${item.path}" data-type="directory"><div class="tree-item" style="padding-left:${depth*12+8}px"><svg class="chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg><span class="icon file-icon-folder"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"/></svg></span><span class="name">${item.name}</span></div><div class="tree-children" style="display:none">${item.children?this.renderItems(item.children,depth+1):''}</div></div>`;}
      else{const ic=`file-icon-${(item.extension||'').replace('.','')}`; return `<div class="tree-node" data-path="${item.path}" data-type="file"><div class="tree-item" style="padding-left:${depth*12+20}px"><span class="icon ${ic}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg></span><span class="name">${item.name}</span></div></div>`;}
    }).join('');
  }
  bindTreeEvents(){
    this.treeEl.querySelectorAll('.tree-node').forEach(node=>{
      node.querySelector('.tree-item').addEventListener('click',()=>{
        const path=node.dataset.path;const type=node.dataset.type;
        if(type==='directory'){const ch=node.querySelector('.tree-children');const exp=ch.style.display!=='none';ch.style.display=exp?'none':'block';node.querySelector('.tree-item').classList.toggle('expanded',!exp);}
        else{this.openFile(path);}
      });
      node.querySelector('.tree-item').addEventListener('contextmenu',e=>{e.preventDefault();if(confirm(`Delete "${node.dataset.path}"?`))this.deleteFile(node.dataset.path);});
    });
  }
  async openFile(filePath){
    if(!this.projectId)return;
    try{const r=await fetch('/api/files/read',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:this.projectId,filePath})});const d=await r.json();if(d.content!==undefined)window.editor?.openFile(filePath,d.content);
    this.treeEl.querySelectorAll('.tree-item').forEach(el=>el.classList.remove('active'));const n=this.treeEl.querySelector(`[data-path="${filePath}"] .tree-item`);if(n)n.classList.add('active');}catch(e){}
  }
  async deleteFile(filePath){
    if(!this.projectId)return;
    try{await fetch('/api/files',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:this.projectId,filePath})});this.loadFiles(this.projectId);}catch(e){}
  }
  promptNewFile(){const name=prompt('Enter file name (e.g., src/utils.js):');if(!name||!this.projectId)return;this.createFile(name.trim());}
  promptNewFolder(){const name=prompt('Enter folder name:');if(!name||!this.projectId)return;this.createFile(name.trim()+'/.gitkeep');}
  async createFile(filePath){
    try{await fetch('/api/files',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:this.projectId,filePath,content:''})});await this.loadFiles(this.projectId);if(!filePath.endsWith('.gitkeep'))this.openFile(filePath);}catch(e){}
  }
}
window.fileExplorer=new FileExplorer();
