using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.Controls;
namespace CrowdForge {
    public static class ForgeInput {
        public static Vector3 MousePosition => Mouse.current == null ? Vector3.zero : (Vector3)Mouse.current.position.ReadValue();
        public static bool Fire => Mouse.current != null && Mouse.current.leftButton.isPressed;
        public static bool Held(KeyCode code) => Key(code)?.isPressed ?? false;
        public static bool Pressed(KeyCode code) => Key(code)?.wasPressedThisFrame ?? false;
        static KeyControl Key(KeyCode code) {
            var k=Keyboard.current;if(k==null)return null;
            switch(code) {
                case KeyCode.W:return k.wKey;case KeyCode.A:return k.aKey;
                case KeyCode.S:return k.sKey;case KeyCode.D:return k.dKey;
                case KeyCode.UpArrow:return k.upArrowKey;case KeyCode.DownArrow:return k.downArrowKey;
                case KeyCode.LeftArrow:return k.leftArrowKey;case KeyCode.RightArrow:return k.rightArrowKey;
                case KeyCode.Space:return k.spaceKey;case KeyCode.M:return k.mKey;
                default:return null;
            }
        }
    }
}
