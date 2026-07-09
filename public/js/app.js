class App {
  constructor() { this.currentProject=null; this.templates=[]; this.selectedTemplate=null; this.init(); }
  async init() { this.bindEvents(); await this.loadTemplates(); await this.loadProjects(); }
  bindEvents() {
    document.getElementById('toggle-sidebar').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('collapsed'));
    document.getElementById('theme-toggle').addEventListener('click',()=>{const h=document.documentElement;h.setAttribute('data-theme',h.getAttribute('data-theme')==='dark'?'light':'dark');});
    ['new-project-btn','welcome-new-project','sidebar-new-project'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('click',()=>this.showNewProjectModal());});
    document.getElementById('welcome-chat')?.addEventListener('click',()=>document.getElementById('chat-input').focus());
    document.getElementById('close-modal')?.addEventListener('click',()=>this.hideModal());
    document.getElementById('cancel-modal')?.addEventListener('click',()=>this.hideModal());
    document.getElementById('modal-overlay')?.addEventListener('click',e=>{if(e.target===e.currentTarget)this.hideModal();});
    document.getElementById('create-project-btn')?.addEventListener('click',()=>this.createProject());
    document.getElementById('split-view-btn')?.addEventListener('click',()=>{const c=document.getElementById('chat-panel');c.style.display=c.style.display==='none'?'flex':'none';});
    document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey){if(e.key==='s'){e.preventDefault();window.editor?.saveCurrentFile();}if(e.key==='b'){e.preventDefault();document.getElementById('sidebar').classList.toggle('collapsed');}}});
  }
  async loadTemplates(){try{const r=await fetch('/api/templates');const d=await r.json();this.templates=d.templates;this.renderTemplates();}catch(e){}}
  async loadProjects(){try{const r=await fetch('/api/projects');const d=await r.json();if(d.projects?.length>0)this.setProject(d.projects[0].name);}catch(e){}}
  renderTemplates(){
    const grid=document.getElementById('template-grid');if(!grid)return;
    grid.innerHTML=this.templates.map(t=>`<div class="template-card" data-template="${t.id}"><h4>${t.name}</h4><p>${t.description}</p></div>`).join('');
    grid.querySelectorAll('.template-card').forEach(card=>{card.addEventListener('click',()=>{grid.querySelectorAll('.template-card').forEach(c=>c.classList.remove('selected'));card.classList.add('selected');this.selectedTemplate=card.dataset.template;});});
  }
  showNewProjectModal(){document.getElementById('modal-overlay').style.display='flex';document.getElementById('project-name').focus();this.selectedTemplate=null;document.querySelectorAll('.template-card').forEach(c=>c.classList.remove('selected'));}
  hideModal(){document.getElementById('modal-overlay').style.display='none';}
  async createProject(){
    const name=document.getElementById('project-name').value.trim();
    if(!name){document.getElementById('project-name').style.borderColor='var(--error)';return;}
    if(!this.selectedTemplate){alert('Please select a template');return;}
    try{const r=await fetch('/api/projects/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,template:this.selectedTemplate})});const d=await r.json();if(d.project){this.hideModal();this.setProject(d.project.id);document.getElementById('project-name').value='';}}catch(e){}
  }
  setProject(projectId){this.currentProject=projectId;document.getElementById('current-project').textContent=projectId;window.fileExplorer?.loadFiles(projectId);}
}
window.app=new App();
