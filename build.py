#!/usr/bin/env python3
# src/ の部品を単一の index.html に組み立てる
import pathlib
root = pathlib.Path(__file__).parent
src = root / "src"

style = (src/"style.css").read_text()
body = (src/"body.html").read_text()
data = (src/"data.js").read_text()
r1 = (src/"render1.js").read_text()
r2 = (src/"render2.js").read_text()
r3 = (src/"render3.js").read_text()
app = (src/"app.js").read_text()

html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TOYOTA GA4 COMMAND — toyota.jp デジタル計測ボード</title>
<meta name="description" content="トヨタ toyota.jp の GA4 データを車種×商材×動線×オーディエンス×広告でクロス分析するゲームUIダッシュボード（GA4実測キャリブレーション済み）">
<meta property="og:title" content="TOYOTA GA4 COMMAND">
<meta property="og:description" content="車種・商材・動線・再訪・アフィニティ・広告トラッキングを1画面でクロス分析">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%2300E5C7'/><text x='50' y='68' font-size='52' text-anchor='middle' font-family='monospace' font-weight='800' fill='%23041220'>T</text></svg>">
<style>
{style}
</style>
</head>
<body>
{body}
<script src="https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js"></script>
<script>window.echarts||document.write('<script src="assets/echarts.min.js"><\\/script>')</script>
<script>
{data}
</script>
<script>
{r1}
</script>
<script>
{r2}
</script>
<script>
{r3}
</script>
<script>
{app}
</script>
</body>
</html>
"""
(root/"index.html").write_text(html)
print("built index.html:", len(html)//1024, "KB")
