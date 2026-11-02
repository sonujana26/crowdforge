using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
namespace CrowdForge.Editor {
    public static class ForgeBuild {
        [MenuItem("CrowdForge/Open arena scene")]
        public static void OpenArena() {
            if(!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())return;
            var paths=AssetDatabase.FindAssets("Arena t:Scene");
            foreach(var guid in paths){var path=AssetDatabase.GUIDToAssetPath(guid);if(path.EndsWith("/Arena.unity")){EditorSceneManager.OpenScene(path);return;}}
            throw new InvalidOperationException("Sync the CrowdForge Arena scene first.");
        }
        [MenuItem("CrowdForge/Build Web arena")]
        public static void Web(){
            if(!BuildPipeline.IsBuildTargetSupported(BuildTargetGroup.WebGL,BuildTarget.WebGL))throw new InvalidOperationException("Install Unity Web Build Support.");
            Directory.CreateDirectory("Assets/Scenes");
            var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
            new GameObject("CrowdForge runtime").AddComponent<ArenaGame>();
            var volume=new GameObject("Build-retained atmosphere").AddComponent<Volume>();volume.isGlobal=true;
            Directory.CreateDirectory("Assets/Resources");
            var profile = AssetDatabase.LoadAssetAtPath<VolumeProfile>("Assets/Resources/ForgeAtmosphere.asset");
            if (!profile) {
                profile = ScriptableObject.CreateInstance<VolumeProfile>();
                AssetDatabase.CreateAsset(profile, "Assets/Resources/ForgeAtmosphere.asset");
            }
            if (!profile.TryGet<Bloom>(out var bloom)) {
                bloom = profile.Add<Bloom>();
                AssetDatabase.AddObjectToAsset(bloom, profile);
            }
            bloom.intensity.Override(0.38f);
            bloom.threshold.Override(1.25f);
            bloom.scatter.Override(0.65f);

            if (!profile.TryGet<Tonemapping>(out var tone)) {
                tone = profile.Add<Tonemapping>();
                AssetDatabase.AddObjectToAsset(tone, profile);
            }
            tone.mode.Override(TonemappingMode.ACES);

            if (!profile.TryGet<ColorAdjustments>(out var colorAdj)) {
                colorAdj = profile.Add<ColorAdjustments>();
                AssetDatabase.AddObjectToAsset(colorAdj, profile);
            }
            colorAdj.postExposure.Override(0.22f);
            colorAdj.contrast.Override(15f);
            colorAdj.saturation.Override(8f);

            EditorUtility.SetDirty(profile);
            volume.sharedProfile = profile;
            EditorSceneManager.SaveScene(scene,"Assets/Scenes/Arena.unity");
            // Retain both normal and emissive shader variants used by runtime-created materials.
            var material=new Material(Shader.Find("Universal Render Pipeline/Lit"));Directory.CreateDirectory("Assets/Resources");
            if(!AssetDatabase.LoadAssetAtPath<Material>("Assets/Resources/ForgeStandard.mat"))AssetDatabase.CreateAsset(material,"Assets/Resources/ForgeStandard.mat");else UnityEngine.Object.DestroyImmediate(material);
            var glow=new Material(Shader.Find("Universal Render Pipeline/Lit"));glow.EnableKeyword("_EMISSION");glow.SetColor("_EmissionColor",Color.cyan*3);
            if(!AssetDatabase.LoadAssetAtPath<Material>("Assets/Resources/ForgeGlow.mat"))AssetDatabase.CreateAsset(glow,"Assets/Resources/ForgeGlow.mat");else UnityEngine.Object.DestroyImmediate(glow);
            var particles=new Material(Shader.Find("Universal Render Pipeline/Particles/Unlit"));
            if(!AssetDatabase.LoadAssetAtPath<Material>("Assets/Resources/ForgeParticles.mat"))AssetDatabase.CreateAsset(particles,"Assets/Resources/ForgeParticles.mat");else UnityEngine.Object.DestroyImmediate(particles);
            AssetDatabase.SaveAssets();
            PlayerSettings.companyName="CrowdForge";PlayerSettings.productName="CrowdForge Arena";
            PlayerSettings.WebGL.compressionFormat=WebGLCompressionFormat.Disabled;
            PlayerSettings.WebGL.dataCaching=false;PlayerSettings.WebGL.nameFilesAsHashes=false;
            PlayerSettings.runInBackground=true;
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.WebGL,ScriptingImplementation.IL2CPP);
            var settings=new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/ProjectSettings.asset")[0]);
            var input=settings.FindProperty("activeInputHandler");if(input!=null){input.intValue=1;settings.ApplyModifiedPropertiesWithoutUndo();}
            var output=Path.GetFullPath(Path.Combine(Application.dataPath,"../../Builds/UnityWeb"));
            var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{"Assets/Scenes/Arena.unity"},locationPathName=output,target=BuildTarget.WebGL,options=BuildOptions.None});
            if(report.summary.result!=BuildResult.Succeeded)throw new InvalidOperationException("Unity Web build failed. Inspect the Unity log.");
            Debug.Log("Unity Web build ready for validation: "+output);
        }
    }
}

