# Trauma Team International

这是一个致敬《赛博朋克2077》世界观中 Trauma Team International 的交互式解剖疼痛探索与日常参考工具。

页面把部位、疼痛感觉、外部表现编码为本地特征，通过 `data/knowledge.json` 中的规则和加权相似度输出最多三个“参考匹配”。没有大模型或远程推理 API。

## 开发

```bash
npm install
npm run dev
```

## 构建 / GitHub Pages

```bash
npm run build
# 将 dist 发布到 GitHub Pages（项目 Pages 设为 GitHub Actions 或上传 dist）
```

## 模型与许可

示例加载 Anatria-3D 的公开男性骨骼、肌肉和神经 GLB：
https://github.com/Nurkan1/Anatria-3D/tree/main/public/anatomy

这些文件来自 Z-Anatomy / BodyParts3D 衍生数据，仓库标注 CC BY-SA 4.0；使用时应保留署名与相同许可要求。第一版故意不伪装成完整男女双套模型：当前 UI 使用全身男性分层模型，避免把不完整的女性躯干模型误称为完整解剖覆盖。生产部署建议将经过许可审查的 GLB 固定下载到自己的 CDN，并继续保留 NOTICE/署名。

## 医疗边界

百分比是本地规则匹配分，不是经过临床验证的患病概率，也不是诊断。遇到严重、持续、快速加重或伴神经功能异常的症状应及时就医。
