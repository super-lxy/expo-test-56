# 子分类选择器重构方案

## 参考图分析

### 设计特点
1. **底部弹窗（Bottom Sheet）**
   - 从底部滑入
   - 圆角卡片（顶部圆角）
   - 半透明遮罩背景

2. **网格布局**
   - 5列网格
   - 图标 + 文字垂直排列
   - 图标大、间距舒适

3. **视觉风格**
   - 简洁的白色背景
   - 无多余装饰
   - 顶部小把手（可选）

## 当前问题

当前实现：
- ❌ 结构复杂（多层嵌套）
- ❌ 样式混乱（列表改网格导致冲突）
- ❌ 动画笨重（Animated.View）
- ❌ 视觉不统一

## 重构方案

### 简化结构
```tsx
<Modal transparent visible>
  <Pressable style={overlay} onPress={close}>
    <View style={bottomSheet}>
      <View style={handle} />
      <ScrollView>
        <View style={grid}>
          {items.map(item => (
            <Item key={item.id} />
          ))}
        </View>
      </ScrollView>
    </View>
  </Pressable>
</Modal>
```

### 样式规范
```typescript
overlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.4)',
  justifyContent: 'flex-end',
}

bottomSheet: {
  backgroundColor: '#FFFFFF',
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  paddingTop: 8,
  paddingBottom: safeArea.bottom + 20,
  maxHeight: '70%',
}

handle: {
  width: 36,
  height: 4,
  backgroundColor: '#D4D4D8',
  borderRadius: 2,
  alignSelf: 'center',
  marginBottom: 16,
}

grid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  paddingHorizontal: 20,
  gap: 16,
}

gridItem: {
  width: '18%',  // 5列
  alignItems: 'center',
  gap: 8,
}

iconBox: {
  width: 56,
  height: 56,
  borderRadius: 16,
  backgroundColor: '#F4F4F5',
  alignItems: 'center',
  justifyContent: 'center',
}

label: {
  fontSize: 12,
  color: '#3F3F46',
  textAlign: 'center',
}
```

## 实现步骤

1. 备份当前文件
2. 重写子分类弹窗部分
3. 移除 Animated.View
4. 简化样式定义
5. 测试交互

## 待确认

需要我：
1. 完全重写 CategoryGrid 组件？
2. 还是只修改子分类弹窗部分？
3. 保留添加按钮功能？
