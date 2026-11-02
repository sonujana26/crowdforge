using UnityEngine;
namespace CrowdForge {
    public sealed class ForgePlayer : MonoBehaviour {
        public float Health { get; private set; } = 100;
        public float DashRemaining => Mathf.Max(0,nextDash-game.Clock);
        CharacterController body;Transform visual;ForgeRig rig;Vector3 velocity;ArenaGame game;float nextDash,dashEnd,invulnerable,nextAttack;
        public void Initialize(ArenaGame owner){game=owner;body=gameObject.AddComponent<CharacterController>();body.center=Vector3.up*.8f;body.height=1.6f;body.radius=.4f;body.stepOffset=.35f;visual=ForgeArt.Robot(transform,-1);rig=visual.GetComponent<ForgeRig>();var bar=new GameObject("Player health");bar.transform.SetParent(transform);bar.AddComponent<ForgeVitalBar>().Initialize(game,null,this);}
        public void ResetPlayer(float health){body.enabled=false;transform.position=new Vector3(0,.4f,-3);body.enabled=true;Health=health;velocity=Vector3.zero;nextDash=dashEnd=invulnerable=nextAttack=0;}
        public void Tick(float dt){
            if(Health<=0)return;
            var move=new Vector3((ForgeInput.Held(KeyCode.D)||ForgeInput.Held(KeyCode.RightArrow)?1:0)-(ForgeInput.Held(KeyCode.A)||ForgeInput.Held(KeyCode.LeftArrow)?1:0),0,(ForgeInput.Held(KeyCode.W)||ForgeInput.Held(KeyCode.UpArrow)?1:0)-(ForgeInput.Held(KeyCode.S)||ForgeInput.Held(KeyCode.DownArrow)?1:0)).normalized;
            var ray=game.Camera.ScreenPointToRay(ForgeInput.MousePosition);var plane=new Plane(Vector3.up,Vector3.up*.8f);
            if(plane.Raycast(ray,out float enter)){var aim=ray.GetPoint(enter)-transform.position;aim.y=0;if(aim.sqrMagnitude>.01f)transform.rotation=Quaternion.LookRotation(aim);}
            if(ForgeInput.Pressed(KeyCode.Space)&&game.Clock>=nextDash){velocity=(move.sqrMagnitude>0?move:transform.forward)*22;dashEnd=game.Clock+.18f;nextDash=game.Clock+2.4f;invulnerable=game.Clock+.3f;game.Effects.Burst(transform.position,Color.cyan);}
            if(game.Clock>=dashEnd)velocity=Vector3.Lerp(velocity,move*7,1-Mathf.Exp(-game.Modifiers.Friction(transform.position)*dt));
            body.Move((velocity+game.Modifiers.Pull(transform.position)+Vector3.down*4)*dt);
            var pos=transform.position;pos.x=Mathf.Clamp(pos.x,-18.6f,18.6f);pos.z=Mathf.Clamp(pos.z,-11.5f,11.5f);transform.position=pos;
            visual.localPosition=Vector3.up*(Mathf.Sin(game.Clock*18)*.035f*move.magnitude);
            rig.Animate(move.magnitude,game.Clock);
            if(ForgeInput.Fire&&game.Clock>=nextAttack){nextAttack=game.Clock+.16f;game.Fire(transform.position+Vector3.up*.9f+transform.forward*.7f,transform.forward,true,25,28);game.Effects.Tone(520,.045f);}
        }
        public void Damage(float amount){if(game.Clock<invulnerable||Health<=0)return;Health=Mathf.Max(0,Health-amount);invulnerable=game.Clock+.8f;rig.Flash();game.Effects.Burst(transform.position,Color.red);game.Shake=.12f;game.Effects.Tone(Health<=0?60:110,.15f);}
    }
}

