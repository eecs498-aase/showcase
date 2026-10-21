"""Regenerate fictional demonstration content. Requires Pillow; not used by the site build."""
from pathlib import Path
import json, math
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parent
REG=ROOT/'participants'; REG.mkdir(exist_ok=True)
people=[
 {'id':900000001,'displayName':'Maya Chen','bio':'Fictional maker profile. Interested in tools that make software easier to understand.','github':None},
 {'id':900000002,'displayName':'Theo Park','bio':'Fictional maker profile. Exploring useful interfaces for everyday problems.','github':None},
 {'id':900000003,'displayName':'Jules Rivera','bio':'Fictional maker profile. Making the reasoning behind an agent visible.','github':None},
 {'id':900000004,'displayName':'Sam Okafor','bio':'Fictional maker profile. Building with small models and a curious mind.','github':None}]
(REG/'f26.json').write_text(json.dumps({'cohort':'f26','participants':people},indent=2)+'\n')

projects=[
 ('Patch Notes',900000001,'01','Developer tools',['Code review','Agents'],['Python','Codex'],
  'A second set of eyes for your next pull request.',
  'Reviewing unfamiliar code is hard when the reason for a change is buried in the diff.',
  'A review workspace that places a plain-language explanation beside the lines that support it.',
  'Codex helps draft a change summary from a bounded diff. Every claim links back to the source.',
  'I designed the evidence format, limited what context reaches the model, and checked misleading summaries against small test cases.',
  'This sample illustrates small Python changes. It does not approve code or replace a human reviewer.',
  '#bdcbb6','patch'),
 ('Field Notes',900000001,'02','Research',['Research','Knowledge'],['Python','SQLite','Local models'],
  'Turn scattered reading into a connected trail of ideas.',
  'Research notes accumulate faster than we can reconnect them to their original sources.',
  'A local notebook that groups related passages and keeps citations attached to every summary.',
  'A small model suggests themes from a selected collection. The source passage stays one click away.',
  'I chose a local storage model, made provenance visible, and tested whether suggestions remain tied to the supplied text.',
  'This example uses a small curated collection. Suggested connections may still need correction.',
  '#c1b9d2','notes'),
 ('Office Hours',900000002,'01','Learning',['Learning','Practice'],['TypeScript','React','Codex'],
  'A little more guidance. A little less giving the answer away.',
  'Students often need a useful next question rather than a complete worked solution.',
  'A practice companion that responds with a hint, a question, and a small check for understanding.',
  'The model turns an instructor-written outline into progressively more specific hints.',
  'I defined the hint ladder and reviewed examples where the model accidentally revealed a solution.',
  'This fictional project is a learning aid. It is not a course help channel or a grading system.',
  '#e6a06b','hours'),
 ('Tiny Tasks',900000002,'02','Everyday tools',['Planning','Productivity'],['TypeScript','SQLite','Aider'],
  'Make a big, vague task small enough to start.',
  'An item like finish the project does not tell you what to do next.',
  'A quiet planning board that turns a broad goal into a few editable next actions.',
  'Aider helped implement the interface. A model suggests task breakdowns that the user can rewrite.',
  'I kept the user in control of the plan, added an undo path, and tested that edits preserve task order.',
  'Suggestions do not understand your real schedule. Dates and commitments always stay with the user.',
  '#ded9b9','tasks'),
 ('Trace Agent',900000003,'01','Developer tools',['Observability','Agents'],['Python','Codex'],
  'Follow the decisions between a prompt and a result.',
  'When an agent fails, the final answer rarely explains which earlier decision caused the problem.',
  'A trace viewer that lays out model calls, tool activity, retries, and approval gates.',
  'An agent generates the execution trace. The viewer groups events without hiding the original records.',
  'I designed the event schema and verified the timeline against deliberately failing runs.',
  'The sample handles one trace format. Imported logs need to be cleaned before they can be shared.',
  '#9baebb','trace'),
 ('Local Lens',900000004,'01','Research',['Evaluation','Local AI'],['Python','Local models'],
  'Small models. Real questions. Results you can inspect.',
  'A single benchmark number hides the examples that a small model handles well or poorly.',
  'An evaluation desk for comparing local models on a compact set of practical tasks.',
  'Local models answer the same prompts. A simple viewer keeps outputs beside the evaluation criteria.',
  'I wrote the task set, recorded repeat runs, and inspected failures instead of relying only on a total score.',
  'This illustrative evaluation is small. Its results would not establish general model quality.',
  '#a7bbd6','lens')]

font_candidates=['/System/Library/Fonts/Menlo.ttc','/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf']
fontpath=next((x for x in font_candidates if Path(x).exists()),None)
def font(size):
 return ImageFont.truetype(fontpath,size) if fontpath else ImageFont.load_default()
def image_for(title,bg,kind,detail=False):
 im=Image.new('RGB',(1440,1000),bg); d=ImageDraw.Draw(im)
 ink='#17252e'; paper='#f4f3eb'; muted='#79867e'; navy='#132431'; yellow='#ffcb05'
 def text(x,y,t,size=18,fill=ink): d.text((x,y),t,font=font(size),fill=fill)
 def box(rect,fill,outline=None,width=1): d.rectangle(rect,fill=fill,outline=outline,width=width)
 # The image is an authored illustration of an interface, not a real student screenshot.
 for x in range(0,1440,64): d.line((x,0,x,1000),fill=tuple(max(0,c-7) for c in im.getpixel((0,0))),width=1)
 for y in range(0,1000,64): d.line((0,y,1440,y),fill=tuple(max(0,c-7) for c in im.getpixel((0,0))),width=1)
 box((115,131,1340,898),tuple(max(0,c-25) for c in im.getpixel((0,0))))
 box((95,108,1320,874),paper)
 box((95,108,1320,167),navy)
 for x,col in [(124,'#d5a581'),(146,'#e6c857'),(168,'#a1bf91')]: d.ellipse((x,131,x+9,140),fill=col)
 text(211,126,title.lower().replace(' ','-')+' / workspace',16,paper)
 text(1118,126,'LOCAL / 01',14,'#91a7b5')
 if kind=='patch':
  box((95,167,777,874),navy); text(131,204,'review / src / tools.py',16,'#8ca4b0')
  for i,(line,col) in enumerate([('  def run_tool(call):',paper),('    validate(call.arguments)',paper),('-   execute(call)', '#cc998d'),('+   result = execute(call)', '#a9d39d'),('+   return checked(result)', '#a9d39d'),('',paper),('  def checked(result):',paper),('    assert result.ok',paper),('    return result.value',paper)]):
   y=283+i*44
   if line.startswith('+'): box((115,y-5,753,y+34),'#294237')
   text(131,y,str(i+16),15,'#687e8c'); text(190,y,line,20,col)
  text(820,210,'CHANGE SUMMARY',14,muted); text(820,259,'Keep the result.',29)
  for i,t in enumerate(['Return the checked value','instead of discarding it.','The caller can now inspect','the tool response.']): text(820,330+i*33,t,20)
  box((818,517,1271,588),'#dce7d7'); text(840,541,'02 claims / 02 sources',17)
  for y,t in [(632,'01  Return value'),(694,'02  Validation boundary')]: d.line((820,y-15,1269,y-15),fill='#c0c6bc'); text(820,y,t,18)
 elif kind=='notes':
  box((95,167,385,874),'#e5e2eb'); text(126,207,'YOUR LIBRARY',14,muted)
  for i,t in enumerate(['All notes     12','Reading        5','Connections    8','Saved ideas    3']): text(126,270+i*65,t,16)
  text(425,205,'COLLECTION / 003',14,muted); text(425,258,'Ideas leave a trail.',31)
  for x,y,w,t,sub in [(432,354,356,'Context is a choice','note 04 / 3 sources'),(850,354,383,'Memory has a cost','note 07 / 2 sources'),(635,609,409,'What stays in the loop?','connection / 04 + 07')]:
   box((x,y,x+w,y+168),'#f9f8f3', '#a9a3b7'); text(x+23,y+32,t,18); text(x+23,y+115,sub,13,muted)
  d.line((610,523,827,609),fill='#91879f',width=2); d.line((1040,523,827,609),fill='#91879f',width=2)
 elif kind=='hours':
  box((95,167,446,874),'#efddc8'); text(135,218,'PRACTICE / 004',14,muted); text(135,282,'One step',31); text(135,327,'at a time.',31)
  for i,t in enumerate(['1  Understand','2  Try a hint','3  Check your idea']): text(135,464+i*68,t,18)
  text(494,218,'LET\'S THINK IT THROUGH',14,muted); text(494,285,'What changes after',31); text(494,326,'the first iteration?',31)
  for i,t in enumerate(['Look at the state before the loop.','Which value is read first?','Write that value down, then try','the next step by hand.']): text(494,434+i*35,t,21)
  box((494,649,1242,749),navy); text(523,682,'I think the value becomes...',19,paper); text(1165,682,'->',22,yellow)
 elif kind=='tasks':
  text(143,211,'MONDAY / YOUR NEXT MOVE',14,muted); text(143,268,'Start smaller.',41)
  columns=[('NEXT', ['Sketch the interface','Write one test']),('IN PROGRESS',['Build the first view']),('DONE',['Choose a small scope','Read the code'])]
  for i,(heading,items) in enumerate(columns):
   x=143+i*385; text(x,386,heading,16); d.line((x,422,x+346,422),fill='#a9ac99')
   for j,t in enumerate(items):
    y=450+j*156; box((x,y,x+346,y+130), '#fffefa' if i!=2 else '#d8dfcc'); text(x+20,y+27,t,17); text(x+20,y+92,'ONE BOUNDED STEP' if i!=2 else 'COMPLETE / CHECKED',11,muted)
 elif kind=='trace':
  box((95,167,1320,874),navy); text(140,211,'RUN 042 / TOOL LOOP',15,'#88a0ad'); text(140,261,'Every step, accounted for.',33,paper)
  nodes=[('CONTEXT','128 tokens'),('MODEL','1.2 seconds'),('TOOL','read_file'),('REVIEW','approval gate')]
  for i,(name,sub) in enumerate(nodes):
   x=146+i*285; d.line((x+100,459,x+390,459),fill='#637d87',width=2)
   d.ellipse((x+70,421,x+146,497),fill=yellow if i==3 else '#223d4b',outline='#7c99a5',width=2)
   text(x+98,443,str(i+1),20,navy if i==3 else paper); text(x+28,550,name,22,paper); text(x+28,591,sub,14,'#9cb2bf')
  box((139,705,1269,803),'#243b48'); text(164,741,'status: awaiting approval    /    no files changed',19,paper)
 else:
  text(143,211,'EVALUATION / RUN 008',14,muted); text(143,265,'Look past the score.',35)
  text(143,359,'MODEL',14,muted); text(420,359,'TASK',14,muted); text(918,359,'RESULT',14,muted)
  for i,(task,w,col) in enumerate([('Summarize a diff',220,'#abc398'),('Follow a schema',275,'#abc398'),('Find an edge case',136,'#d9b377'),('Check a claim',186,'#a7b8cb')]):
   y=423+i*91; d.line((142,y-24,1269,y-24),fill='#b5bcc4'); text(143,y,'small / 04',18); text(420,y,task,20); box((918,y,918+w,y+27),col)
 if detail:
  box((96,815,1319,873),'#ffcb05'); text(130,832,'ILLUSTRATIVE WORKSPACE / FICTIONAL PROJECT / DESIGN PREVIEW',16)
 else:
  text(95,934,'AASE SHOWCASE / CONCEPT ART / NOT A STUDENT SUBMISSION',14,ink)
 return im

for title,owner,slot,category,tags,tools,summary,problem,built,ai,human,limits,bg,kind in projects:
 folder=ROOT/'projects'/'f26'/str(owner)/slot; folder.mkdir(parents=True,exist_ok=True)
 image_for(title,bg,kind).save(folder/'cover.webp','WEBP',quality=88)
 image_for(title,bg,kind,True).save(folder/'detail.webp','WEBP',quality=88)
 data={'schemaVersion':1,'projectId':f'f26-{owner}-{slot}','ownerId':owner,'cohort':'f26','slot':slot,'title':title,'summary':summary,'category':category,'tags':tags,'tools':tools,'cover':{'src':'cover.webp','alt':f'Illustrative {title} interface for this fictional project'},'screenshots':[{'src':'detail.webp','alt':f'Detail of the fictional {title} workspace, labeled as a design preview'}],'story':{'problem':problem,'built':built,'aiUse':ai,'humanDecisions':human,'limitations':limits},'links':{'demo':None,'video':None,'source':None}}
 (folder/'project.json').write_text(json.dumps(data,indent=2)+'\n')
print(f'Generated {len(projects)} fictional project records and illustrations.')
