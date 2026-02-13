// Pipeline templates for iawarrior

export interface PipelineStageTemplate {
    name: string;
    color: string;
    order: number;
}

export interface PipelineTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    category: string;
    stages: PipelineStageTemplate[];
}

export const PIPELINE_TEMPLATES: PipelineTemplate[] = [
    {
        id: 'sales',
        name: 'Sales Pipeline',
        description: 'Standard sales process from lead to close',
        icon: 'TrendingUp',
        color: '#3a86ff',
        category: 'sales',
        stages: [
            { name: 'New Lead', color: '#4361ee', order: 1 },
            { name: 'Contacted', color: '#3a86ff', order: 2 },
            { name: 'Qualified', color: '#7209b7', order: 3 },
            { name: 'Proposal Sent', color: '#f72585', order: 4 },
            { name: 'Negotiation', color: '#4cc9f0', order: 5 },
            { name: 'Closed Won', color: '#10b981', order: 6 },
            { name: 'Closed Lost', color: '#ef4444', order: 7 },
        ],
    },
    {
        id: 'customer-success',
        name: 'Customer Success',
        description: 'Customer onboarding and success tracking',
        icon: 'Users',
        color: '#10b981',
        category: 'customer-success',
        stages: [
            { name: 'New Customer', color: '#4895ef', order: 1 },
            { name: 'Onboarding', color: '#560bad', order: 2 },
            { name: 'Active', color: '#10b981', order: 3 },
            { name: 'At Risk', color: '#f3722c', order: 4 },
            { name: 'Churned', color: '#ef4444', order: 5 },
        ],
    },
    {
        id: 'support',
        name: 'Support Tickets',
        description: 'Customer support ticket workflow',
        icon: 'Headphones',
        color: '#8b5cf6',
        category: 'support',
        stages: [
            { name: 'New Ticket', color: '#4361ee', order: 1 },
            { name: 'In Progress', color: '#f8961e', order: 2 },
            { name: 'Waiting on Customer', color: '#90be6d', order: 3 },
            { name: 'Resolved', color: '#10b981', order: 4 },
            { name: 'Closed', color: '#577590', order: 5 },
        ],
    },
    {
        id: 'recruitment',
        name: 'Recruitment',
        description: 'Candidate hiring process',
        icon: 'Briefcase',
        color: '#06b6d4',
        category: 'hr',
        stages: [
            { name: 'Applied', color: '#4361ee', order: 1 },
            { name: 'Screening', color: '#3a86ff', order: 2 },
            { name: 'Interview', color: '#7209b7', order: 3 },
            { name: 'Offer', color: '#f72585', order: 4 },
            { name: 'Hired', color: '#10b981', order: 5 },
            { name: 'Rejected', color: '#ef4444', order: 6 },
        ],
    },
    {
        id: 'project-management',
        name: 'Project Management',
        description: 'Project task workflow',
        icon: 'FolderKanban',
        color: '#f59e0b',
        category: 'project-management',
        stages: [
            { name: 'Backlog', color: '#577590', order: 1 },
            { name: 'Todo', color: '#4361ee', order: 2 },
            { name: 'In Progress', color: '#f8961e', order: 3 },
            { name: 'Review', color: '#90be6d', order: 4 },
            { name: 'Done', color: '#10b981', order: 5 },
        ],
    },
    {
        id: 'marketing',
        name: 'Marketing Campaign',
        description: 'Marketing campaign workflow',
        icon: 'Megaphone',
        color: '#ec4899',
        category: 'marketing',
        stages: [
            { name: 'Planning', color: '#4361ee', order: 1 },
            { name: 'In Progress', color: '#f8961e', order: 2 },
            { name: 'Review', color: '#90be6d', order: 3 },
            { name: 'Launched', color: '#10b981', order: 4 },
            { name: 'Completed', color: '#577590', order: 5 },
        ],
    },
];

export function getTemplateById(id: string): PipelineTemplate | undefined {
    return PIPELINE_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(category: string): PipelineTemplate[] {
    return PIPELINE_TEMPLATES.filter(t => t.category === category);
}

export function formatCategoryLabel(category: string): string {
    const categoryLabels: Record<string, string> = {
        'sales': 'Sales',
        'customer-success': 'Customer Success',
        'support': 'Support',
        'hr': 'Human Resources',
        'project-management': 'Project Management',
        'marketing': 'Marketing',
    };
    return categoryLabels[category] || category.charAt(0).toUpperCase() + category.slice(1);
}
