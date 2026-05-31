// Projects 栏目数据 —— 只放精选项目。新增项目按下面结构往 projectGroups 里加。
// private 项目不给 url（页面会标 🔒）。
//
// 示例结构：
//   {
//     label: '产品 / 平台',
//     items: [
//       { name: 'danclaw', desc: '……', private: true },
//       { name: 'aura', desc: '……', url: 'https://github.com/casperkwok/aura' },
//     ],
//   }

export interface Project {
  name: string
  desc: string
  url?: string
  private?: boolean
}

export interface ProjectGroup {
  label: string
  items: Project[]
}

export const projectGroups: ProjectGroup[] = []
