using UnityEngine;
namespace CrowdForge {
    public sealed class ForgeEffects : MonoBehaviour {
        ParticleSystem particles;LineRenderer warning;AudioSource source;AudioClip tone;float nextTone;
        static readonly Vector3[] circle = new Vector3[40];
        public void Initialize(){
            for (int n = 0; n < 40; n++) {
                float a = n * Mathf.PI * 2f / 40f;
                circle[n] = new Vector3(Mathf.Cos(a), 0, Mathf.Sin(a));
            }
            particles=gameObject.AddComponent<ParticleSystem>();var main=particles.main;main.startLifetime=.4f;main.startSpeed=3;main.startSize=.08f;main.maxParticles=300;main.simulationSpace=ParticleSystemSimulationSpace.World;main.playOnAwake=false;
            var emission=particles.emission;emission.enabled=false;var shape=particles.shape;shape.shapeType=ParticleSystemShapeType.Sphere;
            var renderer=particles.GetComponent<ParticleSystemRenderer>();renderer.sharedMaterial=new Material(Shader.Find("Universal Render Pipeline/Particles/Unlit"));
            var line=new GameObject("Warning ring");warning=line.AddComponent<LineRenderer>();warning.sharedMaterial=ForgeArt.Amber;warning.startWidth=warning.endWidth=.06f;warning.loop=true;warning.positionCount=40;
            source=gameObject.AddComponent<AudioSource>();source.playOnAwake=false;source.volume=.2f;
            tone=AudioClip.Create("Original synthesized pulse",4410,1,44100,false);var samples=new float[4410];for(int i=0;i<samples.Length;i++)samples[i]=Mathf.Sin(i*2*Mathf.PI*440/44100)*(1-i/(float)samples.Length);tone.SetData(samples,0);
        }
        public void Burst(Vector3 p,Color color,int count=18){particles.Emit(new ParticleSystem.EmitParams{position=p+Vector3.up,startColor=color},count);}
        public void Warning(Vector3 p,float radius){warning.enabled=true;for(int n=0;n<40;n++)warning.SetPosition(n,p+new Vector3(circle[n].x*radius,.15f,circle[n].z*radius));}
        public void ClearWarning(){warning.enabled=false;}
        public void Tone(float frequency,float volume){if(AudioListener.volume<=0||Time.unscaledTime<nextTone)return;nextTone=Time.unscaledTime+.045f;source.pitch=frequency/440;source.PlayOneShot(tone,volume);}
        void OnDestroy(){if(tone)Destroy(tone);}
    }
}

