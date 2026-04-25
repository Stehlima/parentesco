$base = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/"
$files = @(
    "tiny_face_detector_model-weights_manifest.json",
    "tiny_face_detector_model-shard1",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model-shard1",
    "face_recognition_model-weights_manifest.json",
    "face_recognition_model-shard1",
    "face_recognition_model-shard2",
    "ssd_mobilenetv1_model-weights_manifest.json",
    "ssd_mobilenetv1_model-shard1",
    "ssd_mobilenetv1_model-shard2"
)

if (!(Test-Path "public/models")) {
    New-Item -ItemType Directory -Path "public/models" -Force
}

foreach ($f in $files) {
    $url = $base + $f
    $out = "public/models/" + $f
    Write-Host "Downloading $url to $out..."
    Invoke-WebRequest -Uri $url -OutFile $out
}
