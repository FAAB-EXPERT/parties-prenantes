import React, { useState, useMemo } from 'react';
import {
  Users,
  Database,
  Grid,
  CheckSquare,
  Briefcase,
  Layers,
  Filter,
  Search,
  RefreshCw,
  CheckCircle2,
  Award,
  Landmark,
  Handshake,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Building2,
  Plus,
  Trash2,
  Edit3,
  Lock,
  Sparkles,
  FileDown,
  X,
  AlertCircle,
  Target,
  MessageSquare,
  Compass
} from 'lucide-react';
import {
  ACTOR_CATEGORIES_ORDERED,
  ActorCategoryType,
  ActorGovernanceInstance,
  CategorizedActor,
  Dossier,
  LanguageCode,
  Task,
  UserProfile
} from '../types';
import { ensureDossierCategorizedActors, getSmartActorDefaults } from '../db';

export type StakeholderTabMode =
  | 'registre_acteurs'
  | 'analyse_concernes'
  | 'matrice_pouvoir_interet'
  | 'matrice_decisions';

interface StakeholderGovernanceTabsProps {
  mode: StakeholderTabMode;
  dossier: Dossier;
  userProfile: UserProfile;
  language: LanguageCode;
  filterAxeId: string;
  setFilterAxeId: (id: string) => void;
  filterProjectId: string;
  setFilterProjectId: (id: string) => void;
  onUpdateCategorizedActors: (updatedActors: CategorizedActor[]) => void;
  onRenameActorInRaci?: (oldName: string, newName: string) => void;
  onDeleteActorFromDossier?: (actorId: string, actorName: string) => void;
  onUpdateTask: (
    projectId: string,
    taskId: string,
    patch: Partial<Task>
  ) => void;
  onAddTaskInPhase?: (
    projectId: string,
    phase: string,
    taskType?: 'tache' | 'jalon'
  ) => void;
  onNavigateTab?: (tab: string) => void;
}

const GOVERNANCE_OPTIONS: {
  value: ActorGovernanceInstance;
  labelFr: string;
  labelEn: string;
  badgeClass: string;
}[] = [
  {
    value: 'COPIL',
    labelFr: 'COPIL (Comité de Pilotage)',
    labelEn: 'COPIL (Steering Committee)',
    badgeClass:
      'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700'
  },
  {
    value: 'COPROJ',
    labelFr: 'COPROJ (Comité de Projet)',
    labelEn: 'COPROJ (Project Committee)',
    badgeClass:
      'bg-rose-50 dark:bg-rose-950/60 text-[#881337] dark:text-[#fda4af] border-rose-300 dark:border-rose-700'
  },
  {
    value: 'COPIL & COPROJ',
    labelFr: 'COPIL & COPROJ',
    labelEn: 'COPIL & COPROJ',
    badgeClass:
      'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
  },
  {
    value: 'Opérationnel / Aucun',
    labelFr: 'Opérationnel / Aucun',
    labelEn: 'Operational / None',
    badgeClass:
      'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
  }
];

export const StakeholderGovernanceTabs: React.FC<StakeholderGovernanceTabsProps> = ({
  mode,
  dossier,
  userProfile,
  language,
  filterAxeId,
  setFilterAxeId,
  filterProjectId,
  setFilterProjectId,
  onUpdateCategorizedActors,
  onRenameActorInRaci,
  onDeleteActorFromDossier,
  onUpdateTask,
  onNavigateTab
}) => {
  const isEn = language === 'EN';

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    'ALL' | ActorCategoryType
  >('ALL');
  const [selectedPostureFilter, setSelectedPostureFilter] = useState<
    'ALL' | 'GERER' | 'SATISFAIRE' | 'INFORMER' | 'SURVEILLER'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});

  // Modal d'analyse et configuration d'un acteur
  const [editingActorId, setEditingActorId] = useState<string | null>(null);
  // Modal d'ajout d'un nouvel acteur dans le Registre des Acteurs
  const [isAddActorModalOpen, setIsAddActorModalOpen] = useState<boolean>(false);
  const [newActorDraft, setNewActorDraft] = useState<{
    name: string;
    category: ActorCategoryType;
    roleOrFunction: string;
    organization: string;
    phone: string;
    email: string;
    address: string;
    governanceInstance: ActorGovernanceInstance;
    axeId: string;
    projectId: string;
    raciRole: 'R' | 'A' | 'C' | 'I';
  }>({
    name: '',
    category: 'Interne',
    roleOrFunction: '',
    organization: dossier?.institution || userProfile.institution || '',
    phone: '+225 ',
    email: '',
    address: 'Abidjan, Côte d’Ivoire',
    governanceInstance: 'COPROJ',
    axeId: 'ALL',
    projectId: 'ALL',
    raciRole: 'C'
  });

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  // Liste complète synchronisée à 100 % avec l'onglet RACI & Catégorie du programme actif
  const allProgramActors = useMemo<CategorizedActor[]>(() => {
    if (!dossier) return [];
    return ensureDossierCategorizedActors(dossier, userProfile);
  }, [dossier, userProfile]);

  const programAxes = useMemo(() => dossier?.axes || [], [dossier?.axes]);

  const availableProjectsForFilter = useMemo(() => {
    const axes =
      filterAxeId === 'ALL'
        ? programAxes
        : programAxes.filter(a => a.id === filterAxeId);
    return axes.flatMap(a => a.projects || []);
  }, [programAxes, filterAxeId]);

  // Ensemble des acteurs intervenant dans l'Axe / Projet sélectionné (via les tâches RACI)
  const allowedActorNamesByScope = useMemo<Set<string> | null>(() => {
    if (filterAxeId === 'ALL' && filterProjectId === 'ALL') {
      return null;
    }
    const set = new Set<string>();
    const splitNames = (raw?: string): string[] => {
      if (!raw) return [];
      return raw
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(
          s =>
            s.length > 0 &&
            s !== '—' &&
            s !== '-' &&
            s !== 'néant' &&
            s !== 'neant' &&
            s !== 'none'
        );
    };

    programAxes.forEach(axe => {
      if (filterAxeId !== 'ALL' && axe.id !== filterAxeId) return;
      (axe.projects || []).forEach(proj => {
        if (filterProjectId !== 'ALL' && proj.id !== filterProjectId) return;
        (proj.tasks || []).forEach(task => {
          splitNames(task.assignee || task.raciR || task.responsabilite).forEach(
            n => set.add(n)
          );
          splitNames(task.autorite || task.raciA).forEach(n => set.add(n));
          splitNames(task.consulte || task.raciC).forEach(n => set.add(n));
          splitNames(task.informe || task.raciI).forEach(n => set.add(n));
        });
      });
    });

    return set;
  }, [programAxes, filterAxeId, filterProjectId]);

  const getMendelowQuadrant = (actor: CategorizedActor) => {
    const p = actor.pouvoir || 'Faible';
    const i = actor.influence || 'Fort';
    if (p === 'Fort' && i === 'Fort') {
      return {
        code: 'GERER' as const,
        labelFr: 'Gérer de près (Acteur Clé)',
        labelEn: 'Manage Closely (Key Player)',
        badgeClass:
          'bg-rose-100 dark:bg-rose-950/70 text-[#881337] dark:text-[#fda4af] border-rose-300 dark:border-rose-700'
      };
    }
    if (p === 'Fort' && i === 'Faible') {
      return {
        code: 'SATISFAIRE' as const,
        labelFr: 'Maintenir satisfait',
        labelEn: 'Keep Satisfied',
        badgeClass:
          'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700'
      };
    }
    if (p === 'Faible' && i === 'Fort') {
      return {
        code: 'INFORMER' as const,
        labelFr: 'Tenir informé',
        labelEn: 'Keep Informed',
        badgeClass:
          'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
      };
    }
    return {
      code: 'SURVEILLER' as const,
      labelFr: 'Surveiller (Veille)',
      labelEn: 'Monitor (Minimal Effort)',
      badgeClass:
        'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
    };
  };

  // Acteurs filtrés selon le périmètre hiérarchique Programme -> Axe -> Projet + Catégorie + Posture + Recherche
  const filteredActors = useMemo<CategorizedActor[]>(() => {
    return allProgramActors.filter(actor => {
      if (allowedActorNamesByScope) {
        const inRaciTasksOfScope = allowedActorNamesByScope.has(
          actor.name.trim().toLowerCase()
        );
        const matchExplicitScope =
          (filterAxeId === 'ALL' || actor.axeId === filterAxeId) &&
          (filterProjectId === 'ALL' || actor.projectId === filterProjectId);
        if (!inRaciTasksOfScope && !matchExplicitScope) {
          return false;
        }
      }
      if (
        selectedCategoryFilter !== 'ALL' &&
        actor.category !== selectedCategoryFilter
      ) {
        return false;
      }
      if (selectedPostureFilter !== 'ALL') {
        const quad = getMendelowQuadrant(actor);
        if (quad.code !== selectedPostureFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          actor.name.toLowerCase().includes(q) ||
          (actor.roleOrFunction || '').toLowerCase().includes(q) ||
          (actor.organization || '').toLowerCase().includes(q) ||
          (actor.phone || '').toLowerCase().includes(q) ||
          (actor.email || '').toLowerCase().includes(q) ||
          (actor.address || '').toLowerCase().includes(q) ||
          (actor.governanceInstance || '').toLowerCase().includes(q) ||
          (actor.matricule || '').toLowerCase().includes(q) ||
          (actor.mission || '').toLowerCase().includes(q) ||
          (actor.planCommunication || '').toLowerCase().includes(q) ||
          actor.category.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    allProgramActors,
    allowedActorNamesByScope,
    filterAxeId,
    filterProjectId,
    selectedCategoryFilter,
    selectedPostureFilter,
    searchQuery
  ]);

  // Liste des décisions / activités WBS filtrées pour la Matrice des Décisions
  const filteredDecisionTasks = useMemo(() => {
    const rows: Array<{
      axeId: string;
      axeName: string;
      projectId: string;
      projectName: string;
      wbsCode: string;
      task: Task;
    }> = [];

    programAxes.forEach((axe, aIdx) => {
      if (filterAxeId !== 'ALL' && axe.id !== filterAxeId) return;
      (axe.projects || []).forEach((proj, pIdx) => {
        if (filterProjectId !== 'ALL' && proj.id !== filterProjectId) return;
        (proj.tasks || []).forEach((task, tIdx) => {
          const code = `${aIdx + 1}.${pIdx + 1}.${tIdx + 1}`;
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const match =
              task.name.toLowerCase().includes(q) ||
              (task.livrable || '').toLowerCase().includes(q) ||
              (task.assignee || '').toLowerCase().includes(q) ||
              (task.autorite || '').toLowerCase().includes(q) ||
              (task.consulte || '').toLowerCase().includes(q) ||
              (task.informe || '').toLowerCase().includes(q) ||
              axe.name.toLowerCase().includes(q) ||
              proj.name.toLowerCase().includes(q);
            if (!match) return;
          }
          rows.push({
            axeId: axe.id,
            axeName: axe.name,
            projectId: proj.id,
            projectName: proj.name,
            wbsCode: code,
            task
          });
        });
      });
    });

    return rows;
  }, [programAxes, filterAxeId, filterProjectId, searchQuery]);

  const getCategoryBadgeStyle = (cat: ActorCategoryType) => {
    switch (cat) {
      case 'Bénéficiaires':
        return {
          bg: 'bg-teal-50 dark:bg-teal-950/50',
          border: 'border-teal-300 dark:border-teal-700',
          text: 'text-teal-800 dark:text-teal-300',
          pill: 'bg-teal-600 text-white',
          icon: Users
        };
      case 'Interne':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/60',
          border: 'border-[#e11d48] dark:border-[#fda4af]',
          text: 'text-[#881337] dark:text-[#fda4af]',
          pill: 'bg-[#881337] text-[#fda4af]',
          icon: ShieldCheck
        };
      case 'Externe':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/50',
          border: 'border-amber-300 dark:border-amber-700',
          text: 'text-amber-900 dark:text-amber-300',
          pill: 'bg-amber-600 text-white',
          icon: Landmark
        };
      case 'Prestataire':
        return {
          bg: 'bg-indigo-50 dark:bg-indigo-950/50',
          border: 'border-indigo-300 dark:border-indigo-700',
          text: 'text-indigo-900 dark:text-indigo-300',
          pill: 'bg-indigo-600 text-white',
          icon: Briefcase
        };
      case 'Partenaire Financier':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/50',
          border: 'border-emerald-300 dark:border-emerald-700',
          text: 'text-emerald-900 dark:text-emerald-300',
          pill: 'bg-emerald-600 text-white',
          icon: Handshake
        };
    }
  };

  const handleUpdateSingleActor = (
    actorId: string,
    patch: Partial<CategorizedActor>
  ) => {
    const next = allProgramActors.map(item => {
      if (item.id !== actorId) return item;
      const updated = { ...item, ...patch };
      // Si l'utilisateur bascule sur Bénéficiaires, appliquer automatiquement les champs stratégiques pré-remplis et protégés
      if (patch.category === 'Bénéficiaires') {
        const smart = getSmartActorDefaults(
          'Bénéficiaires',
          updated.roleOrFunction || '',
          updated.name
        );
        updated.pouvoir = smart.pouvoir;
        updated.explicationPouvoir = smart.explicationPouvoir;
        updated.influence = smart.influence;
        updated.explicationInfluence = smart.explicationInfluence;
        updated.planCommunication = smart.planCommunication;
        updated.mission = smart.mission;
        updated.expectationsAndRole = smart.mission;
      }
      return updated;
    });
    onUpdateCategorizedActors(next);
  };

  const handleCommitActorRename = (actor: CategorizedActor) => {
    const draft = nameDrafts[actor.id];
    if (draft === undefined) return;
    const cleanNewName = draft.trim();
    if (!cleanNewName || cleanNewName === actor.name) {
      setNameDrafts(prev => {
        const copy = { ...prev };
        delete copy[actor.id];
        return copy;
      });
      return;
    }

    const oldName = actor.name;
    const nextActors = allProgramActors.map(item =>
      item.id === actor.id ? { ...item, name: cleanNewName } : item
    );
    onUpdateCategorizedActors(nextActors);
    if (onRenameActorInRaci) {
      onRenameActorInRaci(oldName, cleanNewName);
    }
    setNameDrafts(prev => {
      const copy = { ...prev };
      delete copy[actor.id];
      return copy;
    });
    triggerToast(
      isEn
        ? `✓ Actor renamed to "${cleanNewName}" & synced across all tabs`
        : `✓ Acteur renommé en « ${cleanNewName} » et synchronisé sur tous les onglets`
    );
  };

  const handleCreateNewActor = () => {
    const cleanName = newActorDraft.name.trim();
    if (!cleanName) return;

    const targetAxeId =
      newActorDraft.axeId !== 'ALL'
        ? newActorDraft.axeId
        : filterAxeId !== 'ALL'
        ? filterAxeId
        : programAxes[0]?.id || 'ALL';
    const targetAxe =
      programAxes.find(a => a.id === targetAxeId) || programAxes[0];
    const targetProjId =
      newActorDraft.projectId !== 'ALL'
        ? newActorDraft.projectId
        : filterProjectId !== 'ALL'
        ? filterProjectId
        : targetAxe?.projects?.[0]?.id || 'ALL';
    const targetProj =
      targetAxe?.projects?.find(p => p.id === targetProjId) ||
      targetAxe?.projects?.[0];

    const smart = getSmartActorDefaults(
      newActorDraft.category,
      newActorDraft.roleOrFunction || cleanName,
      cleanName
    );
    const codeSuffix = String(allProgramActors.length + 1).padStart(3, '0');

    const createdActor: CategorizedActor = {
      id: `cat-act-${dossier.id}-${Date.now()}`,
      name: cleanName,
      category: newActorDraft.category,
      dossierId: dossier.id,
      axeId: targetAxeId,
      projectId: targetProjId,
      roleOrFunction:
        newActorDraft.roleOrFunction.trim() ||
        (newActorDraft.category === 'Bénéficiaires'
          ? 'Représentant des Bénéficiaires & Usagers Finaux'
          : 'Acteur Opérationnel du Programme'),
      organization:
        newActorDraft.organization.trim() ||
        dossier.institution ||
        userProfile.institution,
      department: 'Direction / Unité de Gouvernance',
      email:
        newActorDraft.email.trim() ||
        `${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@faab-actor.org`,
      phone: newActorDraft.phone.trim() || '+225 07 00 00 00 00',
      address: newActorDraft.address.trim() || 'Abidjan, Côte d’Ivoire',
      matricule:
        newActorDraft.category === 'Interne'
          ? `MAT-UGP-${codeSuffix}`
          : `EXT-${newActorDraft.category.slice(0, 3).toUpperCase()}-${codeSuffix}`,
      raciRoles: [newActorDraft.raciRole],
      accreditationLevel:
        newActorDraft.category === 'Interne'
          ? 'ZONE A — ACCÈS TOTAL UGP & SITES'
          : 'ACCÈS PARTENAIRE / INSTANCE DE GOUVERNANCE',
      badgeValidity: '31/12/2026',
      influenceLevel: smart.pouvoir === 'Fort' ? 'Élevée' : 'Moyenne',
      expectationsAndRole: smart.mission,
      governanceInstance: newActorDraft.governanceInstance,
      pouvoir: smart.pouvoir,
      explicationPouvoir: smart.explicationPouvoir,
      influence: smart.influence,
      explicationInfluence: smart.explicationInfluence,
      planCommunication: smart.planCommunication,
      mission: smart.mission,
      isCustomActor: true
    };

    // Synchroniser également avec la première tâche du projet cible pour une cohérence 100 % RACI
    if (targetAxe && targetProj && targetProj.tasks?.length > 0) {
      const firstTask = targetProj.tasks[0];
      const appendActorToField = (current?: string) => {
        const list = (current || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        if (!list.some(n => n.toLowerCase() === cleanName.toLowerCase())) {
          list.push(cleanName);
        }
        return list.join(', ');
      };
      if (newActorDraft.raciRole === 'R') {
        const nextVal = appendActorToField(firstTask.assignee || firstTask.raciR);
        onUpdateTask(targetProj.id, firstTask.id, {
          assignee: nextVal,
          raciR: nextVal
        });
      } else if (newActorDraft.raciRole === 'A') {
        const nextVal = appendActorToField(firstTask.autorite || firstTask.raciA);
        onUpdateTask(targetProj.id, firstTask.id, {
          autorite: nextVal,
          raciA: nextVal
        });
      } else if (newActorDraft.raciRole === 'C') {
        const nextVal = appendActorToField(firstTask.consulte || firstTask.raciC);
        onUpdateTask(targetProj.id, firstTask.id, {
          consulte: nextVal,
          raciC: nextVal
        });
      } else {
        const nextVal = appendActorToField(firstTask.informe || firstTask.raciI);
        onUpdateTask(targetProj.id, firstTask.id, {
          informe: nextVal,
          raciI: nextVal
        });
      }
    }

    onUpdateCategorizedActors([...allProgramActors, createdActor]);
    setIsAddActorModalOpen(false);
    setNewActorDraft({
      name: '',
      category: 'Interne',
      roleOrFunction: '',
      organization: dossier?.institution || userProfile.institution || '',
      phone: '+225 ',
      email: '',
      address: 'Abidjan, Côte d’Ivoire',
      governanceInstance: 'COPROJ',
      axeId: 'ALL',
      projectId: 'ALL',
      raciRole: 'C'
    });
    triggerToast(
      `✓ Acteur « ${cleanName} » ajouté et synchronisé avec RACI & Catégorie !`
    );
  };

  const handleExportCurrentTabCSV = () => {
    const sep = ';';
    let csvContent = '\uFEFF';

    if (mode === 'matrice_decisions') {
      csvContent +=
        [
          'Code WBS',
          'Axe Stratégique',
          'Projet Opérationnel',
          'Phase',
          'Décision / Jalon / Activité',
          'Livrable Attendu',
          'Statut',
          'A - Autorité (Décideur)',
          'R - Responsable (Exécutant)',
          'C - Consultés',
          'I - Informés'
        ].join(sep) + '\n';

      filteredDecisionTasks.forEach(row => {
        const tk = row.task;
        const line = [
          row.wbsCode,
          row.axeName,
          row.projectName,
          tk.phase,
          tk.name,
          tk.livrable || 'Livrable officiel validé',
          tk.status,
          tk.autorite || tk.raciA || '',
          tk.assignee || tk.raciR || '',
          tk.consulte || tk.raciC || '',
          tk.informe || tk.raciI || ''
        ].map(v => `"${String(v || '').replace(/"/g, '""')}"`);
        csvContent += line.join(sep) + '\n';
      });
    } else {
      csvContent +=
        [
          'Matricule',
          'Nom & Prénom',
          'Catégorie',
          'Fonction / Rôle',
          'Organisation / Structure',
          'Téléphone',
          'Email',
          'Siège / Localisation',
          'Instance Gouvernance',
          'Rôles RACI',
          'Pouvoir',
          'Justification du Pouvoir',
          'Intérêt / Influence',
          'Justification Intérêt',
          'Posture Mendelow',
          'Mission & Attentes',
          'Plan de Communication'
        ].join(sep) + '\n';

      filteredActors.forEach(act => {
        const quad = getMendelowQuadrant(act);
        const line = [
          act.matricule,
          act.name,
          act.category,
          act.roleOrFunction,
          act.organization,
          act.phone,
          act.email,
          act.address || '',
          act.governanceInstance || 'Opérationnel / Aucun',
          (act.raciRoles || []).join('/'),
          act.pouvoir || 'Faible',
          act.explicationPouvoir || '',
          act.influence || 'Fort',
          act.explicationInfluence || '',
          quad.labelFr,
          act.mission || act.expectationsAndRole || '',
          act.planCommunication || ''
        ].map(v => `"${String(v || '').replace(/"/g, '""')}"`);
        csvContent += line.join(sep) + '\n';
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FAAB_ACTOR_${mode.toUpperCase()}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast('✓ Export CSV Excel (UTF-8) généré avec succès !');
  };

  // Compteurs analytiques Mendelow
  const mendelowCounts = useMemo(() => {
    const counts = {
      GERER: 0,
      SATISFAIRE: 0,
      INFORMER: 0,
      SURVEILLER: 0
    };
    filteredActors.forEach(act => {
      const q = getMendelowQuadrant(act);
      counts[q.code]++;
    });
    return counts;
  }, [filteredActors]);

  const editingActor = useMemo(
    () => allProgramActors.find(a => a.id === editingActorId) || null,
    [allProgramActors, editingActorId]
  );

  // Configuration de l'en-tête selon l'onglet actif
  const headerConfig = useMemo(() => {
    switch (mode) {
      case 'registre_acteurs':
        return {
          badge: isEn
            ? 'Official Stakeholder Registry • 100% Synced with RACI & Categories'
            : 'Référentiel Officiel des Parties Prenantes • 100 % Synchronisé RACI & Catégories',
          title: isEn
            ? 'Registre des Acteurs (Identification & Governance)'
            : 'Registre des Acteurs & Cartographie Opérationnelle',
          desc: isEn
            ? 'Centralized stakeholder directory of the active programme. Every modification (name, category, contact, governance, Mendelow power/interest) automatically updates RACI, Categories, and Decision Matrices.'
            : 'Répertoire centralisé de tous les acteurs du programme actif. Toute modification (nom, catégorie, coordonnées, instance COPIL/COPROJ, pouvoir/intérêt) se répercute instantanément dans les onglets RACI, Catégorie et Matrices.',
          icon: Database
        };
      case 'analyse_concernes':
        return {
          badge: isEn
            ? 'Strategic Stakeholder Analysis • Power, Interest & Communication Plan'
            : 'Analyse Stratégique des Parties Prenantes • Pouvoir, Intérêt & Plan de Communication',
          title: isEn
            ? 'Analyse des concernés (Missions, Expectations & Strategies)'
            : 'Analyse des concernés (Missions, Attentes & Stratégies d’Engagement)',
          desc: isEn
            ? 'Evaluate each stakeholder’s mission, expectations, decision-making power, operational interest, and tailored communication strategy across the selected Programme, Axis, and Project.'
            : 'Évaluez la mission, les attentes, le niveau de pouvoir, le degré d’intérêt et le plan de communication opérationnel de chaque partie prenante selon le Programme, l’Axe et le Projet sélectionnés.',
          icon: Users
        };
      case 'matrice_pouvoir_interet':
        return {
          badge: isEn
            ? 'Mendelow 2x2 Strategic Grid • Dynamic Power / Interest Positioning'
            : 'Matrice de Mendelow 2×2 • Positionnement Dynamique Pouvoir / Intérêt',
          title: isEn
            ? 'Matrice Pouvoir / Intérêt (Mendelow Governance Quadrants)'
            : 'Matrice Pouvoir / Intérêt (Quadrants Décisionnels de Mendelow)',
          desc: isEn
            ? 'Visualize and calibrate stakeholder positioning across the 4 governance quadrants: Manage Closely (High Power / High Interest), Keep Satisfied, Keep Informed, and Monitor.'
            : 'Visualisez et calibrez en temps réel le positionnement des acteurs dans les 4 quadrants de gouvernance : Gérer de près (Fort/Fort), Maintenir satisfaits (Fort/Faible), Tenir informés (Faible/Fort) et Surveiller (Faible/Faible).',
          icon: Grid
        };
      case 'matrice_decisions':
        return {
          badge: isEn
            ? 'Operational Decision Matrix • WBS Deliverables & R-A-C-I Accountability'
            : 'Matrice Décisionnelle Opérationnelle • Livrables WBS & Responsabilités R-A-C-I',
          title: isEn
            ? 'Matrice des Décisions (Approval Authority, Execution & Consultation)'
            : 'Matrice des Décisions (Autorité d’Approbation, Exécution & Consultation)',
          desc: isEn
            ? 'Direct governance mapping linking every operational milestone and deliverable of the active programme to its Approving Authority (A), Executing Lead (R), Consulted Experts (C), and Informed Stakeholders (I).'
            : 'Cartographie décisionnelle reliant chaque activité et livrable du programme actif à son Autorité d’approbation (A), son Responsable d’exécution (R), ses Experts consultés (C) et ses Parties informées (I).',
          icon: CheckSquare
        };
    }
  }, [mode, isEn]);

  const HeaderIcon = headerConfig.icon;

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-full overflow-x-hidden">
      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-[#881337] text-white text-xs font-black shadow-2xl border border-[#fda4af] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#fda4af] shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* EN-TÊTE INSTITUTIONNEL AU STYLE FAAB ACTOR (THÈME ROUGE) */}
      <div className="bg-gradient-to-r from-[#881337] via-[#9f1239] to-[#be123c] rounded-2xl p-4 sm:p-5 text-white shadow-lg border border-rose-400/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#fda4af] text-[#881337] text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <HeaderIcon className="w-3 h-3 shrink-0" />
                <span>{headerConfig.badge}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-white/15 text-rose-100 text-[10px] font-bold break-words">
                {dossier?.name} ({dossier?.horizonPlan})
              </span>
            </div>
            <h1 className="text-base sm:text-xl font-black uppercase tracking-tight text-white break-words">
              {headerConfig.title}
            </h1>
            <p className="text-xs text-rose-100/90 max-w-4xl leading-relaxed">
              {headerConfig.desc}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {mode === 'registre_acteurs' && (
              <button
                type="button"
                onClick={() => setIsAddActorModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#fda4af] hover:bg-rose-200 text-[#881337] text-[11px] font-black uppercase shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>{isEn ? 'New Actor' : 'Nouvel Acteur'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCurrentTabCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase shadow-md transition-all cursor-pointer"
            >
              <FileDown className="w-4 h-4 shrink-0" />
              <span>{isEn ? 'Export CSV' : 'Exporter CSV'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const synced = ensureDossierCategorizedActors(dossier, userProfile);
                onUpdateCategorizedActors(synced);
                triggerToast(
                  isEn
                    ? '✓ 100% synchronized with RACI, Categories & WBS!'
                    : '✓ Synchronisation 100 % effectuée avec RACI, Catégorie & WBS !'
                );
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-[11px] font-bold transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#fda4af] shrink-0" />
              <span>{isEn ? 'Sync RACI / WBS' : 'Synchroniser RACI / WBS'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* BARRE DE FILTRAGE HIÉRARCHIQUE : PROGRAMME (LECTURE SEULE GLOBAL) -> AXE -> PROJET + RECHERCHE */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase text-[#881337] dark:text-[#fda4af] shrink-0">
              <Filter className="w-4 h-4 text-[#e11d48]" />
              <span>
                {isEn ? 'Hierarchical Scope:' : 'Périmètre Hiérarchique :'}
              </span>
            </div>

            {/* 1. Programme Actif (Sélecteur Global) */}
            <div className="flex items-center gap-1.5 bg-rose-50/90 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-[#fda4af] dark:border-rose-700 min-w-0 max-w-full">
              <Briefcase className="w-3.5 h-3.5 text-[#881337] dark:text-[#fda4af] shrink-0" />
              <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 shrink-0">
                {isEn ? 'Programme:' : 'Programme :'}
              </span>
              <span className="text-xs font-black text-[#881337] dark:text-[#fda4af] truncate max-w-[220px] sm:max-w-[280px]">
                {dossier?.name}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#881337] text-[#fda4af] text-[8.5px] font-black uppercase shrink-0">
                {isEn ? 'Global' : 'Actif'}
              </span>
            </div>

            {/* 2. Sélecteur d'Axe Stratégique */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 min-w-0 max-w-full">
              <Layers className="w-3.5 h-3.5 text-[#e11d48] shrink-0" />
              <span className="text-[10px] font-black uppercase text-slate-500 shrink-0">
                {isEn ? 'Axis:' : 'Axe :'}
              </span>
              <select
                value={filterAxeId}
                onChange={e => {
                  setFilterAxeId(e.target.value);
                  setFilterProjectId('ALL');
                }}
                className="text-xs font-bold text-slate-800 dark:text-white bg-transparent focus:outline-none cursor-pointer max-w-[200px] sm:max-w-[240px] truncate"
              >
                <option value="ALL">
                  {isEn
                    ? `All Axes (${programAxes.length})`
                    : `Tous les Axes (${programAxes.length})`}
                </option>
                {programAxes.map(a => (
                  <option
                    key={a.id}
                    value={a.id}
                    className="dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Sélecteur de Projet Opérationnel */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 min-w-0 max-w-full">
              <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-[10px] font-black uppercase text-slate-500 shrink-0">
                {isEn ? 'Project:' : 'Projet :'}
              </span>
              <select
                value={filterProjectId}
                onChange={e => setFilterProjectId(e.target.value)}
                className="text-xs font-bold text-slate-800 dark:text-white bg-transparent focus:outline-none cursor-pointer max-w-[200px] sm:max-w-[240px] truncate"
              >
                <option value="ALL">
                  {isEn
                    ? `All Projects (${availableProjectsForFilter.length})`
                    : `Tous les Projets (${availableProjectsForFilter.length})`}
                </option>
                {availableProjectsForFilter.map(p => (
                  <option
                    key={p.id}
                    value={p.id}
                    className="dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Filtre par Catégorie (pour les 3 onglets Acteurs) */}
            {mode !== 'matrice_decisions' && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <Users className="w-3.5 h-3.5 text-[#881337] dark:text-[#fda4af] shrink-0" />
                <select
                  value={selectedCategoryFilter}
                  onChange={e =>
                    setSelectedCategoryFilter(
                      e.target.value as 'ALL' | ActorCategoryType
                    )
                  }
                  className="text-xs font-bold text-slate-800 dark:text-white bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="ALL">
                    {isEn ? 'All 5 Categories' : 'Toutes les 5 Catégories'}
                  </option>
                  {ACTOR_CATEGORIES_ORDERED.map(c => (
                    <option key={c.id} value={c.id}>
                      {isEn ? c.labelEn : c.labelFr}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Recherche rapide */}
          <div className="flex flex-wrap items-center gap-2 justify-between xl:justify-end">
            <div className="relative flex-1 sm:flex-initial min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={
                  mode === 'matrice_decisions'
                    ? isEn
                      ? 'Search decision, deliverable, R, A, C, I...'
                      : 'Rechercher décision, livrable, acteur R/A/C/I...'
                    : isEn
                    ? 'Search actor, role, organization, COPIL...'
                    : 'Rechercher acteur, rôle, structure, COPIL...'
                }
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fda4af]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CARTES KPI DE SYNTHÈSE STRATÉGIQUE */}
      {mode !== 'matrice_decisions' && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-[#881337] shadow-xs">
            <div className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
              {isEn ? 'Active Actors in Scope' : 'Acteurs du Périmètre'}
            </div>
            <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">
              {filteredActors.length}{' '}
              <span className="text-xs font-bold text-slate-400">
                / {allProgramActors.length}
              </span>
            </div>
            <div className="text-[10px] text-[#e11d48] dark:text-[#fda4af] font-bold mt-0.5">
              {isEn ? '100% synced with RACI' : 'Synchronisés à 100 % avec RACI'}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setSelectedPostureFilter(prev =>
                prev === 'GERER' ? 'ALL' : 'GERER'
              )
            }
            className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
              selectedPostureFilter === 'GERER'
                ? 'bg-rose-50 dark:bg-rose-950/60 border-2 border-[#881337] dark:border-[#fda4af]'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-600'
            }`}
          >
            <div className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-300">
              1. Gérer de près (Fort / Fort)
            </div>
            <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">
              {mendelowCounts.GERER}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Acteurs Clés & Co-décideurs
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setSelectedPostureFilter(prev =>
                prev === 'SATISFAIRE' ? 'ALL' : 'SATISFAIRE'
              )
            }
            className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
              selectedPostureFilter === 'SATISFAIRE'
                ? 'bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-600'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 border-l-4 border-l-amber-500'
            }`}
          >
            <div className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-300">
              2. Maintenir satisfaits (Fort / Faible)
            </div>
            <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">
              {mendelowCounts.SATISFAIRE}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Autorités & Régulateurs
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setSelectedPostureFilter(prev =>
                prev === 'INFORMER' ? 'ALL' : 'INFORMER'
              )
            }
            className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
              selectedPostureFilter === 'INFORMER'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-600'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-500'
            }`}
          >
            <div className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300">
              3. Tenir informés (Faible / Fort)
            </div>
            <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">
              {mendelowCounts.INFORMER}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Bénéficiaires & Exécutants
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setSelectedPostureFilter(prev =>
                prev === 'SURVEILLER' ? 'ALL' : 'SURVEILLER'
              )
            }
            className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
              selectedPostureFilter === 'SURVEILLER'
                ? 'bg-slate-100 dark:bg-slate-800 border-2 border-slate-500'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 border-l-4 border-l-slate-400'
            }`}
          >
            <div className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">
              4. Surveiller (Faible / Faible)
            </div>
            <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">
              {mendelowCounts.SURVEILLER}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Veille Périodique
            </div>
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ONGLET 1 : REGISTRE DES ACTEURS                                       */}
      {/* ===================================================================== */}
      {mode === 'registre_acteurs' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-rose-50/70 dark:bg-slate-800/80 border-b border-rose-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#881337] dark:text-[#fda4af]" />
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                {isEn
                  ? `Official Stakeholder Register (${filteredActors.length} Actors)`
                  : `Registre Consolidé des Acteurs du Programme (${filteredActors.length} Acteurs)`}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#881337] dark:text-[#fda4af]">
              <span>
                {isEn
                  ? 'Connected in real time to Category, RACI, Analysis & Decision Matrix'
                  : 'Connecté en temps réel aux onglets Catégorie, RACI, Analyse des concernés & Matrices'}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[1000px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase">
                  <th className="py-2.5 px-3 w-[19%]">
                    Matricule, Nom & Fonction
                  </th>
                  <th className="py-2.5 px-2.5 w-[13%]">
                    Catégorie (Ordre 1 à 5)
                  </th>
                  <th className="py-2.5 px-2.5 w-[19%]">
                    Structure & Coordonnées
                  </th>
                  <th className="py-2.5 px-2.5 w-[15%]">
                    Instance & Rôles RACI
                  </th>
                  <th className="py-2.5 px-2.5 w-[20%]">
                    Posture Mendelow (Pouvoir / Intérêt)
                  </th>
                  <th className="py-2.5 px-3 w-[14%] text-right">
                    Actions & Analyse
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredActors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 px-4 text-center text-xs text-slate-400 italic"
                    >
                      Aucun acteur trouvé pour les critères de filtrage sélectionnés.
                    </td>
                  </tr>
                ) : (
                  filteredActors.map(actor => {
                    const style = getCategoryBadgeStyle(actor.category);
                    const quad = getMendelowQuadrant(actor);
                    const displayedName =
                      nameDrafts[actor.id] !== undefined
                        ? nameDrafts[actor.id]
                        : actor.name;
                    const currentGov: ActorGovernanceInstance =
                      actor.governanceInstance || 'Opérationnel / Aucun';
                    const govStyle =
                      GOVERNANCE_OPTIONS.find(g => g.value === currentGov)
                        ?.badgeClass || GOVERNANCE_OPTIONS[3].badgeClass;

                    return (
                      <tr
                        key={actor.id}
                        className="hover:bg-rose-50/30 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* 1. Nom, Fonction, Matricule */}
                        <td className="py-2.5 px-3 align-top space-y-1.5">
                          <input
                            type="text"
                            value={displayedName}
                            onChange={e =>
                              setNameDrafts(prev => ({
                                ...prev,
                                [actor.id]: e.target.value
                              }))
                            }
                            onBlur={() => handleCommitActorRename(actor)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') e.currentTarget.blur();
                            }}
                            className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-extrabold text-slate-900 dark:text-white focus:border-[#e11d48] focus:outline-none text-xs"
                          />
                          <input
                            type="text"
                            value={actor.roleOrFunction || ''}
                            onChange={e =>
                              handleUpdateSingleActor(actor.id, {
                                roleOrFunction: e.target.value
                              })
                            }
                            placeholder="Fonction / Titre..."
                            className="w-full px-2 py-0.5 rounded bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-[#e11d48] text-[10.5px] font-bold text-[#e11d48] dark:text-[#fda4af] focus:outline-none"
                          />
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[9px] font-bold text-[#881337] dark:text-[#fda4af]">
                              {actor.matricule}
                            </span>
                            {actor.category === 'Bénéficiaires' && (
                              <span className="px-1.5 py-0.5 rounded bg-teal-600 text-white text-[8.5px] font-black uppercase flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" /> Pré-calibré
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Catégorie */}
                        <td className="py-2.5 px-2.5 align-top space-y-1.5">
                          <select
                            value={actor.category}
                            onChange={e => {
                              const nextCat = e.target.value as ActorCategoryType;
                              handleUpdateSingleActor(actor.id, {
                                category: nextCat
                              });
                              triggerToast(
                                `✓ Catégorie de « ${actor.name} » mise à jour : ${nextCat}`
                              );
                            }}
                            className={`w-full px-2 py-1.5 rounded-lg border text-[11px] font-extrabold cursor-pointer focus:outline-none ${style.bg} ${style.border} ${style.text}`}
                          >
                            {ACTOR_CATEGORIES_ORDERED.map(c => (
                              <option
                                key={c.id}
                                value={c.id}
                                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                              >
                                {isEn ? c.labelEn : c.labelFr}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* 3. Structure & Coordonnées */}
                        <td className="py-2.5 px-2.5 align-top space-y-1">
                          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <input
                              type="text"
                              value={actor.organization || ''}
                              onChange={e =>
                                handleUpdateSingleActor(actor.id, {
                                  organization: e.target.value
                                })
                              }
                              placeholder="Structure / Institution..."
                              className="w-full bg-transparent text-[10.5px] font-semibold text-slate-800 dark:text-slate-100 focus:outline-none"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                            <Phone className="w-3 h-3 text-[#e11d48] shrink-0" />
                            <input
                              type="text"
                              value={actor.phone || ''}
                              onChange={e =>
                                handleUpdateSingleActor(actor.id, {
                                  phone: e.target.value
                                })
                              }
                              placeholder="Téléphone..."
                              className="w-full bg-transparent text-[10.5px] font-medium text-slate-700 dark:text-slate-200 focus:outline-none"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                            <Mail className="w-3 h-3 text-emerald-600 shrink-0" />
                            <input
                              type="email"
                              value={actor.email || ''}
                              onChange={e =>
                                handleUpdateSingleActor(actor.id, {
                                  email: e.target.value
                                })
                              }
                              placeholder="Email..."
                              className="w-full bg-transparent text-[10.5px] font-medium text-slate-700 dark:text-slate-200 focus:outline-none"
                            />
                          </div>
                        </td>

                        {/* 4. Instance & RACI */}
                        <td className="py-2.5 px-2.5 align-top space-y-1.5">
                          <select
                            value={currentGov}
                            onChange={e =>
                              handleUpdateSingleActor(actor.id, {
                                governanceInstance: e.target
                                  .value as ActorGovernanceInstance
                              })
                            }
                            className={`w-full px-2 py-1 rounded-lg border text-[10px] font-black cursor-pointer focus:outline-none ${govStyle}`}
                          >
                            {GOVERNANCE_OPTIONS.map(opt => (
                              <option
                                key={opt.value}
                                value={opt.value}
                                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                              >
                                {isEn ? opt.labelEn : opt.labelFr}
                              </option>
                            ))}
                          </select>

                          <div className="flex items-center gap-1 pt-0.5">
                            {(['R', 'A', 'C', 'I'] as const).map(rCode => {
                              const active = actor.raciRoles?.includes(rCode);
                              return (
                                <span
                                  key={rCode}
                                  className={`w-5 h-5 rounded flex items-center justify-center text-[9.5px] font-black ${
                                    active
                                      ? 'bg-[#881337] text-[#fda4af] shadow-2xs'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {rCode}
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* 5. Posture Mendelow */}
                        <td className="py-2.5 px-2.5 align-top space-y-1.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-black uppercase ${quad.badgeClass}`}
                          >
                            {isEn ? quad.labelEn : quad.labelFr}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              Pouvoir:{' '}
                              <strong
                                className={
                                  actor.pouvoir === 'Fort'
                                    ? 'text-[#e11d48]'
                                    : 'text-slate-500'
                                }
                              >
                                {actor.pouvoir || 'Faible'}
                              </strong>
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              Intérêt:{' '}
                              <strong
                                className={
                                  actor.influence === 'Fort'
                                    ? 'text-emerald-600'
                                    : 'text-slate-500'
                                }
                              >
                                {actor.influence || 'Fort'}
                              </strong>
                            </span>
                          </div>
                        </td>

                        {/* 6. Actions */}
                        <td className="py-2.5 px-3 align-top text-right space-y-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingActorId(actor.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#881337] hover:bg-[#9f1239] text-[#fda4af] text-[10px] font-black uppercase cursor-pointer shadow-2xs"
                          >
                            <Edit3 className="w-3.5 h-3.5 shrink-0" />
                            <span>Analyser / Éditer</span>
                          </button>

                          {onDeleteActorFromDossier && (
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteActorFromDossier(actor.id, actor.name);
                                  triggerToast(
                                    `Acteur « ${actor.name} » retiré du programme.`
                                  );
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[9.5px] font-bold cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3 shrink-0" />
                                <span>Retirer</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ONGLET 2 : ANALYSE DES CONCERNÉS                                      */}
      {/* ===================================================================== */}
      {mode === 'analyse_concernes' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-rose-50/70 dark:bg-slate-800/80 border-b border-rose-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#881337] dark:text-[#fda4af]" />
                <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Grille d’Analyse Stratégique des Parties Prenantes ({filteredActors.length} Acteurs)
                </h2>
              </div>
              <span className="text-[11px] font-bold text-[#881337] dark:text-[#fda4af]">
                Méthodologie Mendelow & Mitchell (Pouvoir, Intérêt, Attentes & Plan de Communication)
              </span>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[1060px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase">
                    <th className="py-2.5 px-3 w-[17%]">
                      Acteur, Catégorie & RACI
                    </th>
                    <th className="py-2.5 px-2.5 w-[21%]">
                      Mission & Attentes vis-à-vis du Programme
                    </th>
                    <th className="py-2.5 px-2.5 w-[20%]">
                      Niveau & Justification du Pouvoir
                    </th>
                    <th className="py-2.5 px-2.5 w-[20%]">
                      Niveau & Justification de l’Intérêt
                    </th>
                    <th className="py-2.5 px-2.5 w-[22%]">
                      Stratégie Mendelow & Plan de Communication
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredActors.map(actor => {
                    const isBeneficiaire = actor.category === 'Bénéficiaires';
                    const style = getCategoryBadgeStyle(actor.category);
                    const quad = getMendelowQuadrant(actor);

                    return (
                      <tr
                        key={actor.id}
                        className="hover:bg-rose-50/30 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* 1. Acteur & Catégorie */}
                        <td className="py-3 px-3 align-top space-y-1.5">
                          <div className="font-black text-slate-900 dark:text-white text-xs">
                            {actor.name}
                          </div>
                          <div className="text-[10.5px] font-bold text-[#e11d48] dark:text-[#fda4af]">
                            {actor.roleOrFunction}
                          </div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-black uppercase ${style.pill}`}
                          >
                            {actor.category}
                          </span>
                          <div className="flex items-center gap-1 pt-1">
                            {(['R', 'A', 'C', 'I'] as const).map(rCode => (
                              <span
                                key={rCode}
                                className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-black ${
                                  actor.raciRoles?.includes(rCode)
                                    ? 'bg-[#881337] text-[#fda4af]'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                }`}
                              >
                                {rCode}
                              </span>
                            ))}
                            <button
                              type="button"
                              onClick={() => setEditingActorId(actor.id)}
                              className="ml-auto px-2 py-0.5 rounded bg-rose-100 dark:bg-slate-800 text-[#881337] dark:text-[#fda4af] text-[9.5px] font-black hover:bg-rose-200 cursor-pointer"
                            >
                              Fiche Complète
                            </button>
                          </div>
                        </td>

                        {/* 2. Mission & Attentes */}
                        <td className="py-3 px-2.5 align-top space-y-1">
                          {isBeneficiaire && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-200">
                              <Lock className="w-2.5 h-2.5" /> Pré-rempli Bénéficiaires
                            </span>
                          )}
                          <textarea
                            rows={3}
                            readOnly={isBeneficiaire}
                            value={actor.mission || actor.expectationsAndRole || ''}
                            onChange={e =>
                              handleUpdateSingleActor(actor.id, {
                                mission: e.target.value,
                                expectationsAndRole: e.target.value
                              })
                            }
                            className={`w-full p-2 rounded-lg border text-[11px] leading-snug focus:outline-none ${
                              isBeneficiaire
                                ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-not-allowed'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:border-[#e11d48]'
                            }`}
                          />
                        </td>

                        {/* 3. Pouvoir */}
                        <td className="py-3 px-2.5 align-top space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-black uppercase text-slate-500">
                              Pouvoir :
                            </span>
                            <select
                              disabled={isBeneficiaire}
                              value={actor.pouvoir || 'Faible'}
                              onChange={e =>
                                handleUpdateSingleActor(actor.id, {
                                  pouvoir: e.target.value as 'Fort' | 'Faible'
                                })
                              }
                              className={`px-2 py-0.5 rounded text-[10.5px] font-black border ${
                                (actor.pouvoir || 'Faible') === 'Fort'
                                  ? 'bg-rose-100 text-[#881337] border-rose-300 dark:bg-rose-950/70 dark:text-[#fda4af]'
                                  : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              <option value="Fort">FORT (Décisif)</option>
                              <option value="Faible">FAIBLE (Modéré)</option>
                            </select>
                          </div>
                          <textarea
                            rows={3}
                            readOnly={isBeneficiaire}
                            value={actor.explicationPouvoir || ''}
                            onChange={e =>
                              handleUpdateSingleActor(actor.id, {
                                explicationPouvoir: e.target.value
                              })
                            }
                            className={`w-full p-2 rounded-lg border text-[11px] leading-snug focus:outline-none ${
                              isBeneficiaire
                                ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-not-allowed'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:border-[#e11d48]'
                            }`}
                          />
                        </td>

                        {/* 4. Intérêt / Influence */}
                        <td className="py-3 px-2.5 align-top space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-black uppercase text-slate-500">
                              Intérêt :
                            </span>
                            <select
                              disabled={isBeneficiaire}
                              value={actor.influence || 'Fort'}
                              onChange={e =>
                                handleUpdateSingleActor(actor.id, {
                                  influence: e.target.value as 'Fort' | 'Faible'
                                })
                              }
                              className={`px-2 py-0.5 rounded text-[10.5px] font-black border ${
                                (actor.influence || 'Fort') === 'Fort'
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              <option value="Fort">FORT (Direct)</option>
                              <option value="Faible">FAIBLE (Indirect)</option>
                            </select>
                          </div>
                          <textarea
                            rows={3}
                            readOnly={isBeneficiaire}
                            value={actor.explicationInfluence || ''}
                            onChange={e =>
                              handleUpdateSingleActor(actor.id, {
                                explicationInfluence: e.target.value
                              })
                            }
                            className={`w-full p-2 rounded-lg border text-[11px] leading-snug focus:outline-none ${
                              isBeneficiaire
                                ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-not-allowed'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:border-[#e11d48]'
                            }`}
                          />
                        </td>

                        {/* 5. Plan de Communication */}
                        <td className="py-3 px-2.5 align-top space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`px-2 py-0.5 rounded border text-[9.5px] font-black uppercase ${quad.badgeClass}`}
                            >
                              {quad.labelFr}
                            </span>
                            {!isBeneficiaire && (
                              <button
                                type="button"
                                onClick={() => {
                                  const smart = getSmartActorDefaults(
                                    actor.category,
                                    actor.roleOrFunction,
                                    actor.name
                                  );
                                  handleUpdateSingleActor(actor.id, {
                                    pouvoir: smart.pouvoir,
                                    explicationPouvoir: smart.explicationPouvoir,
                                    influence: smart.influence,
                                    explicationInfluence: smart.explicationInfluence,
                                    planCommunication: smart.planCommunication,
                                    mission: smart.mission,
                                    expectationsAndRole: smart.mission
                                  });
                                  triggerToast(
                                    `✓ Analyse Mendelow recalibrée pour « ${actor.name} »`
                                  );
                                }}
                                title="Auto-calibrer selon la catégorie et la fonction"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 dark:bg-slate-800 text-[#881337] dark:text-[#fda4af] border border-rose-200 dark:border-slate-700 text-[9px] font-black cursor-pointer"
                              >
                                <Sparkles className="w-2.5 h-2.5" /> Auto
                              </button>
                            )}
                          </div>
                          <textarea
                            rows={3}
                            readOnly={isBeneficiaire}
                            value={actor.planCommunication || ''}
                            onChange={e =>
                              handleUpdateSingleActor(actor.id, {
                                planCommunication: e.target.value
                              })
                            }
                            className={`w-full p-2 rounded-lg border text-[11px] leading-snug focus:outline-none ${
                              isBeneficiaire
                                ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-not-allowed'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:border-[#e11d48]'
                            }`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ONGLET 3 : MATRICE POUVOIR / INTÉRÊT (MENDELOW 2x2)                   */}
      {/* ===================================================================== */}
      {mode === 'matrice_pouvoir_interet' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* QUADRANT HAUT-GAUCHE : POUVOIR FORT / INTÉRÊT FAIBLE -> MAINTENIR SATISFAITS */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-amber-300 dark:border-amber-700 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded bg-amber-600 text-white text-[9.5px] font-black uppercase">
                    Pouvoir FORT • Intérêt FAIBLE
                  </span>
                  <h3 className="text-sm font-black uppercase text-amber-950 dark:text-amber-200 mt-1">
                    MAINTENIR SATISFAITS (Institutionnels & Régulateurs)
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-amber-300 text-xs font-black text-amber-900 dark:text-amber-300">
                  {
                    filteredActors.filter(
                      a =>
                        (a.pouvoir || 'Faible') === 'Fort' &&
                        (a.influence || 'Fort') === 'Faible'
                    ).length
                  }{' '}
                  Acteur(s)
                </span>
              </div>
              <div className="p-3.5 space-y-2.5 flex-1">
                {filteredActors
                  .filter(
                    a =>
                      (a.pouvoir || 'Faible') === 'Fort' &&
                      (a.influence || 'Fort') === 'Faible'
                  )
                  .map(act => {
                    const style = getCategoryBadgeStyle(act.category);
                    return (
                      <div
                        key={act.id}
                        className="p-3 rounded-xl bg-amber-50/40 dark:bg-slate-800/70 border border-amber-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-black text-xs text-slate-900 dark:text-white">
                              {act.name}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${style.pill}`}
                            >
                              {act.category}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[9px] font-bold">
                              {act.governanceInstance || 'COPIL'}
                            </span>
                          </div>
                          <p className="text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                            {act.roleOrFunction} — {act.organization}
                          </p>
                          <p className="text-[10px] text-amber-900 dark:text-amber-300 italic line-clamp-2">
                            Plan : {act.planCommunication}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {act.category !== 'Bénéficiaires' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateSingleActor(act.id, {
                                  influence: 'Fort'
                                })
                              }
                              className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-amber-300 text-[9.5px] font-black text-amber-900 dark:text-amber-300 hover:bg-amber-100 cursor-pointer"
                            >
                              Intérêt → Fort
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditingActorId(act.id)}
                            className="px-2.5 py-1 rounded bg-[#881337] text-[#fda4af] text-[9.5px] font-black uppercase cursor-pointer"
                          >
                            Détails
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* QUADRANT HAUT-DROITE : POUVOIR FORT / INTÉRÊT FORT -> GÉRER DE PRÈS (ACTEURS CLÉS) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-[#e11d48] dark:border-[#fda4af] shadow-md overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-800 flex items-center justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded bg-[#881337] text-[#fda4af] text-[9.5px] font-black uppercase">
                    Pouvoir FORT • Intérêt FORT ★
                  </span>
                  <h3 className="text-sm font-black uppercase text-[#881337] dark:text-[#fda4af] mt-1">
                    GÉRER DE PRÈS (Acteurs Clés & Co-Décideurs du Programme)
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#881337] text-[#fda4af] text-xs font-black">
                  {
                    filteredActors.filter(
                      a =>
                        (a.pouvoir || 'Faible') === 'Fort' &&
                        (a.influence || 'Fort') === 'Fort'
                    ).length
                  }{' '}
                  Acteur(s)
                </span>
              </div>
              <div className="p-3.5 space-y-2.5 flex-1">
                {filteredActors
                  .filter(
                    a =>
                      (a.pouvoir || 'Faible') === 'Fort' &&
                      (a.influence || 'Fort') === 'Fort'
                  )
                  .map(act => {
                    const style = getCategoryBadgeStyle(act.category);
                    return (
                      <div
                        key={act.id}
                        className="p-3 rounded-xl bg-rose-50/50 dark:bg-slate-800/70 border border-rose-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-black text-xs text-slate-900 dark:text-white">
                              {act.name}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${style.pill}`}
                            >
                              {act.category}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-[#881337] text-[#fda4af] text-[9px] font-black">
                              {act.governanceInstance || 'COPIL'} • [
                              {(act.raciRoles || []).join('/')}]
                            </span>
                          </div>
                          <p className="text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                            {act.roleOrFunction} — {act.organization}
                          </p>
                          <p className="text-[10px] text-[#881337] dark:text-[#fda4af] italic line-clamp-2">
                            Plan : {act.planCommunication}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {act.category !== 'Bénéficiaires' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateSingleActor(act.id, {
                                  pouvoir: 'Faible'
                                })
                              }
                              className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-rose-300 text-[9.5px] font-black text-[#881337] dark:text-[#fda4af] hover:bg-rose-100 cursor-pointer"
                            >
                              Pouvoir → Faible
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditingActorId(act.id)}
                            className="px-2.5 py-1 rounded bg-[#881337] text-[#fda4af] text-[9.5px] font-black uppercase cursor-pointer"
                          >
                            Détails
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* QUADRANT BAS-GAUCHE : POUVOIR FAIBLE / INTÉRÊT FAIBLE -> SURVEILLER */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-xs overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded bg-slate-600 text-white text-[9.5px] font-black uppercase">
                    Pouvoir FAIBLE • Intérêt FAIBLE
                  </span>
                  <h3 className="text-sm font-black uppercase text-slate-800 dark:text-slate-200 mt-1">
                    SURVEILLER (Effort Minimal & Veille Informationnelle)
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-300 text-xs font-black text-slate-700 dark:text-slate-300">
                  {
                    filteredActors.filter(
                      a =>
                        (a.pouvoir || 'Faible') === 'Faible' &&
                        (a.influence || 'Fort') === 'Faible'
                    ).length
                  }{' '}
                  Acteur(s)
                </span>
              </div>
              <div className="p-3.5 space-y-2.5 flex-1">
                {filteredActors
                  .filter(
                    a =>
                      (a.pouvoir || 'Faible') === 'Faible' &&
                      (a.influence || 'Fort') === 'Faible'
                  )
                  .map(act => {
                    const style = getCategoryBadgeStyle(act.category);
                    return (
                      <div
                        key={act.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-black text-xs text-slate-900 dark:text-white">
                              {act.name}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${style.pill}`}
                            >
                              {act.category}
                            </span>
                          </div>
                          <p className="text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                            {act.roleOrFunction}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {act.category !== 'Bénéficiaires' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateSingleActor(act.id, {
                                  influence: 'Fort'
                                })
                              }
                              className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-300 text-[9.5px] font-black text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                              Intérêt → Fort
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditingActorId(act.id)}
                            className="px-2.5 py-1 rounded bg-[#881337] text-[#fda4af] text-[9.5px] font-black uppercase cursor-pointer"
                          >
                            Détails
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* QUADRANT BAS-DROITE : POUVOIR FAIBLE / INTÉRÊT FORT -> TENIR INFORMÉS */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-emerald-400 dark:border-emerald-700 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[9.5px] font-black uppercase">
                    Pouvoir FAIBLE • Intérêt FORT
                  </span>
                  <h3 className="text-sm font-black uppercase text-emerald-950 dark:text-emerald-200 mt-1">
                    TENIR INFORMÉS & IMPLIQUER (Bénéficiaires & Opérateurs)
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-emerald-300 text-xs font-black text-emerald-900 dark:text-emerald-300">
                  {
                    filteredActors.filter(
                      a =>
                        (a.pouvoir || 'Faible') === 'Faible' &&
                        (a.influence || 'Fort') === 'Fort'
                    ).length
                  }{' '}
                  Acteur(s)
                </span>
              </div>
              <div className="p-3.5 space-y-2.5 flex-1">
                {filteredActors
                  .filter(
                    a =>
                      (a.pouvoir || 'Faible') === 'Faible' &&
                      (a.influence || 'Fort') === 'Fort'
                  )
                  .map(act => {
                    const style = getCategoryBadgeStyle(act.category);
                    return (
                      <div
                        key={act.id}
                        className="p-3 rounded-xl bg-emerald-50/40 dark:bg-slate-800/70 border border-emerald-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-black text-xs text-slate-900 dark:text-white">
                              {act.name}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${style.pill}`}
                            >
                              {act.category}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 text-[9px] font-black">
                              [{(act.raciRoles || []).join('/')}]
                            </span>
                          </div>
                          <p className="text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                            {act.roleOrFunction} — {act.organization}
                          </p>
                          <p className="text-[10px] text-emerald-800 dark:text-emerald-300 italic line-clamp-2">
                            Plan : {act.planCommunication}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {act.category !== 'Bénéficiaires' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateSingleActor(act.id, {
                                  pouvoir: 'Fort'
                                })
                              }
                              className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-emerald-300 text-[9.5px] font-black text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 cursor-pointer"
                            >
                              Pouvoir → Fort
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditingActorId(act.id)}
                            className="px-2.5 py-1 rounded bg-[#881337] text-[#fda4af] text-[9.5px] font-black uppercase cursor-pointer"
                          >
                            Détails
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ONGLET 4 : MATRICE DES DÉCISIONS (CONNECTÉE WBS / RACI / ACTEURS)     */}
      {/* ===================================================================== */}
      {mode === 'matrice_decisions' && (
        <div className="space-y-4">
          {/* Bandeau de synthèse des instances décisionnelles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-[#881337]">
              <div className="text-[10px] font-black uppercase text-slate-500">
                Décisions & Jalons WBS du Périmètre
              </div>
              <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                {filteredDecisionTasks.length}
              </div>
              <div className="text-[10px] font-bold text-[#e11d48] dark:text-[#fda4af]">
                Synchronisés avec Planification & RACI
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-amber-500">
              <div className="text-[10px] font-black uppercase text-slate-500">
                Membres COPIL (Décision Stratégique)
              </div>
              <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                {
                  allProgramActors.filter(
                    a =>
                      a.governanceInstance === 'COPIL' ||
                      a.governanceInstance === 'COPIL & COPROJ'
                  ).length
                }
              </div>
              <div className="text-[10px] font-bold text-amber-600">
                Approbation A & Arbitrage Budgétaire
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-500">
              <div className="text-[10px] font-black uppercase text-slate-500">
                Membres COPROJ (Pilotage Technique)
              </div>
              <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                {
                  allProgramActors.filter(
                    a =>
                      a.governanceInstance === 'COPROJ' ||
                      a.governanceInstance === 'COPIL & COPROJ'
                  ).length
                }
              </div>
              <div className="text-[10px] font-bold text-rose-600">
                Coordination R & Revue des Livrables
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-500">
              <div className="text-[10px] font-black uppercase text-slate-500">
                Décisions Validées / Terminées
              </div>
              <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                {
                  filteredDecisionTasks.filter(
                    r => r.task.status === 'Terminé' || r.task.validated
                  ).length
                }{' '}
                / {filteredDecisionTasks.length}
              </div>
              <div className="text-[10px] font-bold text-emerald-600">
                Traçabilité & Redevabilité GAR
              </div>
            </div>
          </div>

          {/* Tableau interactif de la Matrice des Décisions */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-rose-50/70 dark:bg-slate-800/80 border-b border-rose-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#881337] dark:text-[#fda4af]" />
                <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Matrice des Décisions & Circuit d’Approbation R-A-C-I ({filteredDecisionTasks.length} Décisions / Livrables)
                </h2>
              </div>
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('raci')}
                  className="px-2.5 py-1 rounded-lg bg-[#881337] text-[#fda4af] text-[10px] font-black uppercase cursor-pointer"
                >
                  Ouvrir Vue RACI Complète →
                </button>
              )}
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[1080px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase">
                    <th className="py-2.5 px-3 w-[18%]">
                      Axe, Projet & Code WBS
                    </th>
                    <th className="py-2.5 px-2.5 w-[22%]">
                      Objet de la Décision / Activité & Livrable
                    </th>
                    <th className="py-2.5 px-2.5 w-[16%]">
                      <span className="inline-flex items-center gap-1 text-[#881337] dark:text-[#fda4af]">
                        <span className="w-4 h-4 rounded bg-[#881337] text-[#fda4af] inline-flex items-center justify-center text-[9px]">
                          A
                        </span>
                        Autorité d’Approbation (Décideur)
                      </span>
                    </th>
                    <th className="py-2.5 px-2.5 w-[16%]">
                      <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-300">
                        <span className="w-4 h-4 rounded bg-rose-600 text-white inline-flex items-center justify-center text-[9px]">
                          R
                        </span>
                        Responsable d’Exécution
                      </span>
                    </th>
                    <th className="py-2.5 px-2.5 w-[14%]">
                      <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
                        <span className="w-4 h-4 rounded bg-amber-600 text-white inline-flex items-center justify-center text-[9px]">
                          C
                        </span>
                        Consultés (Avis Technique)
                      </span>
                    </th>
                    <th className="py-2.5 px-2.5 w-[14%]">
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                        <span className="w-4 h-4 rounded bg-emerald-600 text-white inline-flex items-center justify-center text-[9px]">
                          I
                        </span>
                        Informés & Bénéficiaires
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredDecisionTasks.map(row => {
                    const { task, axeId, projectId, axeName, projectName, wbsCode } =
                      row;
                    return (
                      <tr
                        key={task.id}
                        className="hover:bg-rose-50/30 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* 1. Axe / Projet / Code WBS */}
                        <td className="py-2.5 px-3 align-top space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-[#881337] text-[#fda4af] font-mono text-[9.5px] font-black">
                              WBS {wbsCode}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300">
                              {task.phase}
                            </span>
                          </div>
                          <div className="text-[10.5px] font-extrabold text-slate-800 dark:text-slate-200 line-clamp-1">
                            {projectName}
                          </div>
                          <div className="text-[9.5px] text-slate-500 line-clamp-1">
                            {axeName}
                          </div>
                        </td>

                        {/* 2. Décision & Livrable */}
                        <td className="py-2.5 px-2.5 align-top space-y-1">
                          <input
                            type="text"
                            value={task.name}
                            onChange={e =>
                              onUpdateTask(projectId, task.id, {
                                name: e.target.value
                              })
                            }
                            className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-extrabold text-slate-900 dark:text-white text-xs focus:border-[#e11d48] focus:outline-none"
                          />
                          <input
                            type="text"
                            value={task.livrable || ''}
                            onChange={e =>
                              onUpdateTask(projectId, task.id, {
                                livrable: e.target.value
                              })
                            }
                            placeholder="Livrable / Acte décisionnel attendu..."
                            className="w-full px-2 py-0.5 rounded bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-400 focus:outline-none"
                          />
                        </td>

                        {/* 3. A - Autorité */}
                        <td className="py-2.5 px-2.5 align-top">
                          <textarea
                            rows={2}
                            value={task.autorite || task.raciA || ''}
                            onChange={e =>
                              onUpdateTask(projectId, task.id, {
                                autorite: e.target.value,
                                raciA: e.target.value
                              })
                            }
                            placeholder="Autorité d'approbation (A)..."
                            className="w-full p-1.5 rounded-lg bg-rose-50/50 dark:bg-slate-800 border border-rose-200 dark:border-slate-700 text-[11px] font-bold text-[#881337] dark:text-[#fda4af] focus:outline-none focus:border-[#e11d48]"
                          />
                        </td>

                        {/* 4. R - Responsable */}
                        <td className="py-2.5 px-2.5 align-top">
                          <textarea
                            rows={2}
                            value={
                              task.assignee ||
                              task.raciR ||
                              task.responsabilite ||
                              ''
                            }
                            onChange={e =>
                              onUpdateTask(projectId, task.id, {
                                assignee: e.target.value,
                                raciR: e.target.value,
                                responsabilite: e.target.value
                              })
                            }
                            placeholder="Responsable d'exécution (R)..."
                            className="w-full p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#e11d48]"
                          />
                        </td>

                        {/* 5. C - Consultés */}
                        <td className="py-2.5 px-2.5 align-top">
                          <textarea
                            rows={2}
                            value={task.consulte || task.raciC || ''}
                            onChange={e =>
                              onUpdateTask(projectId, task.id, {
                                consulte: e.target.value,
                                raciC: e.target.value
                              })
                            }
                            placeholder="Experts / Partenaires consultés (C)..."
                            className="w-full p-1.5 rounded-lg bg-amber-50/40 dark:bg-slate-800 border border-amber-200 dark:border-slate-700 text-[11px] font-semibold text-amber-950 dark:text-amber-200 focus:outline-none focus:border-amber-500"
                          />
                        </td>

                        {/* 6. I - Informés */}
                        <td className="py-2.5 px-2.5 align-top">
                          <textarea
                            rows={2}
                            value={task.informe || task.raciI || ''}
                            onChange={e =>
                              onUpdateTask(projectId, task.id, {
                                informe: e.target.value,
                                raciI: e.target.value
                              })
                            }
                            placeholder="Bénéficiaires / Parties informées (I)..."
                            className="w-full p-1.5 rounded-lg bg-emerald-50/40 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 text-[11px] font-semibold text-emerald-950 dark:text-emerald-200 focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODALE D'ANALYSE STRATÉGIQUE D'UN ACTEUR (MENDELOW / MITCHELL)        */}
      {/* ===================================================================== */}
      {editingActor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-[#881337] dark:border-[#fda4af] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 bg-gradient-to-r from-[#881337] to-[#be123c] text-white flex items-center justify-between sticky top-0 z-10">
              <div>
                <span className="px-2 py-0.5 rounded bg-[#fda4af] text-[#881337] text-[9.5px] font-black uppercase">
                  Fiche Stratégique Acteur • {editingActor.matricule}
                </span>
                <h3 className="text-base font-black uppercase mt-1">
                  {editingActor.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingActorId(null)}
                className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {editingActor.category === 'Bénéficiaires' && (
                <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-200 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black uppercase text-[10.5px]">
                      Protection Méthodologique « Bénéficiaires » Active
                    </div>
                    <p className="text-[11px] mt-0.5">
                      Conformément aux règles de gouvernance de l’application, les champs d’analyse stratégique (Pouvoir, Intérêt, Justifications, Mission et Plan de communication) de la catégorie « Bénéficiaires » sont pré-remplis et verrouillés contre toute altération accidentelle.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Catégorie Officielle (1 à 5)
                  </label>
                  <select
                    value={editingActor.category}
                    onChange={e =>
                      handleUpdateSingleActor(editingActor.id, {
                        category: e.target.value as ActorCategoryType
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                  >
                    {ACTOR_CATEGORIES_ORDERED.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.labelFr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Instance de Gouvernance
                  </label>
                  <select
                    value={
                      editingActor.governanceInstance || 'Opérationnel / Aucun'
                    }
                    onChange={e =>
                      handleUpdateSingleActor(editingActor.id, {
                        governanceInstance: e.target
                          .value as ActorGovernanceInstance
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                  >
                    {GOVERNANCE_OPTIONS.map(g => (
                      <option key={g.value} value={g.value}>
                        {g.labelFr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Niveau de Pouvoir (Mendelow)
                  </label>
                  <select
                    disabled={editingActor.category === 'Bénéficiaires'}
                    value={editingActor.pouvoir || 'Faible'}
                    onChange={e =>
                      handleUpdateSingleActor(editingActor.id, {
                        pouvoir: e.target.value as 'Fort' | 'Faible'
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-black"
                  >
                    <option value="Fort">FORT (Capacité d’arbitrage / blocage)</option>
                    <option value="Faible">FAIBLE (Pouvoir consultatif / limité)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Niveau d’Intérêt / Influence
                  </label>
                  <select
                    disabled={editingActor.category === 'Bénéficiaires'}
                    value={editingActor.influence || 'Fort'}
                    onChange={e =>
                      handleUpdateSingleActor(editingActor.id, {
                        influence: e.target.value as 'Fort' | 'Faible'
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-black"
                  >
                    <option value="Fort">FORT (Impacté directement)</option>
                    <option value="Faible">FAIBLE (Intérêt secondaire)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Mission & Attentes vis-à-vis du Programme
                </label>
                <textarea
                  rows={2}
                  readOnly={editingActor.category === 'Bénéficiaires'}
                  value={
                    editingActor.mission ||
                    editingActor.expectationsAndRole ||
                    ''
                  }
                  onChange={e =>
                    handleUpdateSingleActor(editingActor.id, {
                      mission: e.target.value,
                      expectationsAndRole: e.target.value
                    })
                  }
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Justification du Pouvoir
                </label>
                <textarea
                  rows={2}
                  readOnly={editingActor.category === 'Bénéficiaires'}
                  value={editingActor.explicationPouvoir || ''}
                  onChange={e =>
                    handleUpdateSingleActor(editingActor.id, {
                      explicationPouvoir: e.target.value
                    })
                  }
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Justification de l’Intérêt / Influence
                </label>
                <textarea
                  rows={2}
                  readOnly={editingActor.category === 'Bénéficiaires'}
                  value={editingActor.explicationInfluence || ''}
                  onChange={e =>
                    handleUpdateSingleActor(editingActor.id, {
                      explicationInfluence: e.target.value
                    })
                  }
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Plan de Communication & Engagement Opérationnel
                </label>
                <textarea
                  rows={2}
                  readOnly={editingActor.category === 'Bénéficiaires'}
                  value={editingActor.planCommunication || ''}
                  onChange={e =>
                    handleUpdateSingleActor(editingActor.id, {
                      planCommunication: e.target.value
                    })
                  }
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingActorId(null)}
                  className="px-4 py-2 rounded-xl bg-[#881337] text-[#fda4af] font-black uppercase text-xs cursor-pointer"
                >
                  Fermer & Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODALE D'AJOUT D'UN NOUVEL ACTEUR                                     */}
      {/* ===================================================================== */}
      {isAddActorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-[#881337] dark:border-[#fda4af] shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#881337] to-[#be123c] text-white flex items-center justify-between">
              <h3 className="text-sm font-black uppercase">
                Ajouter un Acteur au Programme Actif
              </h3>
              <button
                type="button"
                onClick={() => setIsAddActorModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Nom & Prénom ou Désignation de l’Entité *
                </label>
                <input
                  type="text"
                  value={newActorDraft.name}
                  onChange={e =>
                    setNewActorDraft(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ex: Direction Générale du Budget / Expert S&E..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Catégorie (1 à 5)
                  </label>
                  <select
                    value={newActorDraft.category}
                    onChange={e =>
                      setNewActorDraft(prev => ({
                        ...prev,
                        category: e.target.value as ActorCategoryType
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                  >
                    {ACTOR_CATEGORIES_ORDERED.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.labelFr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Rôle RACI Principal
                  </label>
                  <select
                    value={newActorDraft.raciRole}
                    onChange={e =>
                      setNewActorDraft(prev => ({
                        ...prev,
                        raciRole: e.target.value as 'R' | 'A' | 'C' | 'I'
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                  >
                    <option value="R">R — Responsable d’exécution</option>
                    <option value="A">A — Autorité d’approbation</option>
                    <option value="C">C — Consulté</option>
                    <option value="I">I — Informé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Fonction / Titre Officiel
                </label>
                <input
                  type="text"
                  value={newActorDraft.roleOrFunction}
                  onChange={e =>
                    setNewActorDraft(prev => ({
                      ...prev,
                      roleOrFunction: e.target.value
                    }))
                  }
                  placeholder="Ex: Point Focal Technique / Chef de Mission..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Organisation / Structure
                  </label>
                  <input
                    type="text"
                    value={newActorDraft.organization}
                    onChange={e =>
                      setNewActorDraft(prev => ({
                        ...prev,
                        organization: e.target.value
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Instance Gouvernance
                  </label>
                  <select
                    value={newActorDraft.governanceInstance}
                    onChange={e =>
                      setNewActorDraft(prev => ({
                        ...prev,
                        governanceInstance: e.target
                          .value as ActorGovernanceInstance
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                  >
                    {GOVERNANCE_OPTIONS.map(g => (
                      <option key={g.value} value={g.value}>
                        {g.labelFr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddActorModalOpen(false)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewActor}
                  className="px-4 py-2 rounded-xl bg-[#881337] text-[#fda4af] font-black uppercase cursor-pointer"
                >
                  Ajouter & Synchroniser
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
