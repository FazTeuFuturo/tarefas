import React from 'react';
import { Quest, QuestCard } from './QuestCard';

interface QuestListProps {
    quests: Quest[];
    onCompleteQuest: (id: string) => void;
    onDeleteQuest?: (id: string) => void;
    onEditQuest?: (quest: Quest) => void;
    onStartTimer?: (id: string, rem: number) => void;
    onPauseTimer?: (id: string, rem: number) => void;
    onResetTimer?: (id: string, init: number) => void;
    isParent?: boolean;
    profiles?: any[];
    onApproveQuest?: (id: string) => void;
    onRejectQuest?: (id: string) => void;
}

export const QuestList: React.FC<QuestListProps> = ({
    quests,
    onCompleteQuest,
    onDeleteQuest,
    onEditQuest,
    onStartTimer,
    onPauseTimer,
    onResetTimer,
    isParent = false,
    profiles = [],
    onApproveQuest,
    onRejectQuest
}) => {
    if (quests.length === 0) {
        return (
            <div className="neo-box" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                <h3 style={{ margin: 0, color: 'var(--color-secondary)' }}>Todas as missões concluídas! 🎉</h3>
            </div>
        );
    }

    return (
        <div>
            {quests.map((quest) => {
                const assignee = profiles.find(p => p.id === quest.assignee_id);
                return (
                    <QuestCard
                        key={quest.id}
                        quest={quest}
                        onComplete={onCompleteQuest}
                        onDelete={onDeleteQuest}
                        onEdit={onEditQuest}
                        isParent={isParent}
                        assigneeName={assignee?.nome}
                        onStartTimer={onStartTimer}
                        onPauseTimer={onPauseTimer}
                        onResetTimer={onResetTimer}
                        onApprove={onApproveQuest}
                        onReject={onRejectQuest}
                    />
                );
            })}
        </div>
    );
};
