"""Original CrowdForge models. Run with Blender --background --python tools/render_assets.py.
Only build-time tooling: exports transparent sprites and a dashboard-only environment render.
"""
import bpy, math, os, random
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'apps/web/public/assets/forge')
os.makedirs(OUT, exist_ok=True)
random.seed(41)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 16
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.film_transparent = True
scene.world.color = (0.08, 0.12, 0.2)
scene.view_settings.view_transform = 'AgX'

def mat(name, color, metal=0.0, glow=0):
    m = bpy.data.materials.new(name); m.diffuse_color = (*color, 1); m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metal; p.inputs['Roughness'].default_value = .36
    p.inputs['Emission Color'].default_value = (*color, 1); p.inputs['Emission Strength'].default_value = glow
    return m
steel=mat('Gunmetal blue',(.075,.13,.21),.8)
edge=mat('Brushed alloy',(.19,.3,.43),.85)
dark=mat('Carbon',(.015,.025,.045),.5)
cyan=mat('Ion cyan',(.015,.65,1),.25,5)
orange=mat('Warning amber',(1,.16,.015),.2,5)
white=mat('Ceramic',(.6,.75,.83),.5)
violet=mat('Phase violet',(.5,.06,1),.3,3)
green=mat('Echo green',(.02,.8,.36),.3,3)
red=mat('Hostile red',(.8,.035,.035),.4,2)

def cube(loc, size, material, bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o=bpy.context.object
    o.scale=size; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    if bevel:
        mod=o.modifiers.new('Machined edges','BEVEL');mod.width=bevel;mod.segments=2
        o.modifiers.new('Normals','WEIGHTED_NORMAL')
    return o
def cyl(loc, radius, depth, material, vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    o=bpy.context.object;o.data.materials.append(material)
    mod=o.modifiers.new('Rim','BEVEL');mod.width=.035;mod.segments=2
    o.modifiers.new('Normals','WEIGHTED_NORMAL');return o
def ring(loc,radius,material,minor=.025):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius,minor_radius=minor,major_segments=64,minor_segments=6,location=loc)
    bpy.context.object.data.materials.append(material)
def tile():
    cube((0,0,-.1),(2,2,.16),dark)
    cube((0,0,0),(1.96,1.96,.1),steel)
    for x in [-.85,.85]:
        for y in [-.85,.85]:cyl((x,y,.07),.025,.03,edge,8)
    for x in [-.6,-.4,-.2,0,.2,.4,.6]:cube((x,.72,.06),(.06,.24,.012),dark,.0)
    cube((.76,-.65,.065),(.05,.22,.01),cyan,.0)
def crate():
    cube((0,0,.45),(1.5,1.4,.9),dark)
    cube((0,0,.92),(1.4,1.3,.12),steel)
    for x in [-.68,.68]:cube((x,0,.52),(.12,1.5,1.05),edge)
    for y in [-.64,.64]:cube((0,y,.53),(1.5,.13,1.05),edge)
    for a in [-.7,.7]:
        o=cube((0,0,1.02),(1.65,.09,.08),edge);o.rotation_euler.z=a
    cube((0,-.72,.6),(.5,.03,.09),orange)
def wall():
    cube((0,0,.3),(2,.75,.6),dark)
    cube((0,0,.65),(1.9,.65,.5),steel)
    for x in [-.82,.82]:cube((x,0,.6),(.22,.9,1.1),edge)
    cube((0,-.4,.55),(1.2,.08,.12),cyan)
    cube((0,0,.94),(.65,.4,.08),dark)
def pillar():
    cyl((0,0,.16),.65,.3,dark,8);cyl((0,0,.5),.45,.6,steel,8)
    cyl((0,0,.9),.55,.17,edge,8);cyl((0,0,1.05),.32,.22,orange,8)
    for x in [-.36,.36]:cube((x,0,.6),(.08,.4,.8),edge)
def reactor():
    cyl((0,0,.03),2.7,.12,dark,64);cyl((0,0,.12),2.55,.18,edge,64)
    cyl((0,0,.23),2.38,.12,steel,64)
    for r in [1,1.75,2.25]:ring((0,0,.3),r,dark,.04)
    for n in range(16):
        a=n*math.tau/16
        o=cube((2.35*math.cos(a),2.35*math.sin(a),.3),(.32,.1,.06),cyan if n%2==0 else edge)
        o.rotation_euler.z=a+math.pi/2
    cyl((0,0,.34),.7,.12,dark,6);cyl((0,0,.42),.5,.1,cyan,6)
    cyl((0,0,.49),.32,.1,steel,6)
def character(kind):
    palette={'player':cyan,'chaser':red,'ranged':violet,'tank':orange,'swarm':green,'elite':violet,'boss':orange}
    light=palette[kind]; armor=white if kind=='player' else steel
    s=1.5 if kind in ['boss','tank'] else 1
    if kind=='swarm':
        cyl((0,0,.3),.35,.3,dark,6)
        for x in [-.5,.5]:
            o=cube((x,0,.3),(.7,.2,.15),edge);o.rotation_euler.z=x
        cyl((0,-.2,.47),.18,.12,light,6);return
    for x in [-.23,.23]:
        cube((x*s,0,.18),(.26*s,.6,.3),dark)
        cube((x*s,.12,.42),(.28*s,.35,.35),armor)
    cube((0,.04,.78),(.72*s,.55,.5),armor)
    cube((0,-.28,.8),(.38*s,.08,.12),light)
    for x in [-.5,.5]:
        cube((x*s,.03,.8),(.28*s,.5,.4),edge)
        cube((x*s,-.35,.65),(.18,.7,.19),dark)
        cube((x*s,-.72,.65),(.12,.12,.12),light)
    cyl((0,0,1.2),.26,.35,armor,8)
    cube((0,-.245,1.21),(.36,.06,.12),light)
    if kind in ['elite','boss','ranged']:
        for x in [-.55,.55]:
            cube((x,.15,1.2),(.2,.85,.2),dark)
            cube((x,-.3,1.2),(.17,.12,.13),light)
    if kind=='boss':
        for x in [-.85,.85]:cyl((x,.15,1.1),.32,.45,edge,8)
        ring((0,0,.6),1.1,light,.04)

bpy.ops.object.camera_add(location=(0,-4,10));camera=bpy.context.object
camera.rotation_euler=(Vector((0,0,.25))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';scene.camera=camera
for loc,color,power,size in [((1,-3,7),(.5,.75,1),1000,5),((-4,2,4),(.05,.45,1),800,4),((4,3,3),(1,.22,.05),700,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.color=color;o.data.shape='DISK';o.data.size=size
    o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()

builders={'floor':tile,'crate':crate,'wall':wall,'pillar':pillar,'reactor':reactor}
builders.update({k:(lambda k=k:character(k)) for k in ['player','chaser','ranged','tank','swarm','elite','boss']})
for name,build in builders.items():
    for o in list(bpy.data.objects):
        if o.type=='MESH':bpy.data.objects.remove(o,do_unlink=True)
    build()
    size=512 if name=='reactor' else 256
    scene.render.resolution_x=size;scene.render.resolution_y=size;scene.render.resolution_percentage=100
    camera.data.ortho_scale=6 if name=='reactor' else 3.1
    scene.render.filepath=os.path.join(OUT,name+'.png');bpy.ops.render.render(write_still=True)

# Dashboard backdrop uses the same original geometry. The playable arena assembles individual sprites.
for o in list(bpy.data.objects):
    if o.type=='MESH':bpy.data.objects.remove(o,do_unlink=True)
def placed(build,x,y):
    old=set(bpy.data.objects);build()
    for o in set(bpy.data.objects)-old:o.location.x+=x;o.location.y+=y
for x in range(-10,11,2):
    for y in range(-6,7,2):placed(tile,x,y)
for x in range(-10,11,2):
    for y in [-8,8]:placed(wall,x,y)
for x in [-12,12]:
    for y in range(-6,7,2):placed(wall,x,y)
for x in [-10,10]:
    for y in [-6,6]:placed(pillar,x,y);placed(crate,x*.8,y*.7)
reactor()
camera.location=(13,-18,24);camera.rotation_euler=(-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=33
scene.render.resolution_x=1600;scene.render.resolution_y=900
scene.render.film_transparent=False;scene.render.filepath=os.path.join(OUT,'control-room.png')
bpy.ops.render.render(write_still=True)
