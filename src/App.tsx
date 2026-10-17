import React, { useState, useMemo, useEffect } from 'react';
import { 
  FolderTree, Folder, Plus, AlertTriangle, 
  CheckCircle, Clock, ChevronRight, Activity, Menu, Target, Map, Users,
  Trash2, Star, DollarSign, 
  Shield, Grid, Layout, Edit3, Filter, Briefcase,
  ListTodo, MessageSquare, BookOpen, X, Database, UserCheck, Download, RefreshCw
} from 'lucide-react';

/* TYPES & INTERFACES DU SYSTÈME DE GOUVERNANCE */
export interface Stakeholder {
  id: string;
  projectId: string;
  category: 'BÉNÉFICIAIRES' | 'INTERNE' | 'EXTERNE' | 'OPÉRATEURS TECHNIQUES' | 'PARTENAIRES FINANCIERS' | string;
  name: string;
  title: string;
  mission: string;
  pouvoir: 'Fort' | 'Faible' | string;
  explicationPouvoir: string;
  influence: 'Fort' | 'Faible' | string;
  explicationInfluence: string;
  planCommunication: string;
}

export interface Task {
  id: string;
  phase: string;
  name: string;
  status: 'À faire' | 'En cours' | 'Terminé' | 'Bloqué' | string;
  raci: {
    R: string;
    A: string;
    C: string;
    I: string;
  };
}

export interface Project {
  id: string;
  name: string;
  tasks: Task[];
}

export interface Axe {
  id: string;
  name: string;
  projects: Project[];
}

export interface Dossier {
  id: string;
  name: string;
  institution: string;
  stakeholders: Stakeholder[];
  axes: Axe[];
}

/* GESTIONNAIRE DE COMPOSANTS ET DE RENDU ANTI-CRASH */
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: unknown;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }
  static getDerivedStateFromError(error: unknown) { return { hasError: true, errorInfo: error }; }
  componentDidCatch(error: unknown, errorInfo: unknown) { console.error("Erreur de rendu détectée :", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-200 max-w-2xl w-full text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Anomalie d'Affichage</h1>
            <p className="text-gray-600 mb-6">Une erreur de structure a été interceptée. L'application a été sécurisée avec succès.</p>
            <button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-md">Recharger l'application</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const STANDARD_PHASES = ['AVANT PROJET', 'CONCEPTION', 'PLANIFICATION', 'EXÉCUTION & SUIVI', 'CLÔTURE'];

/* BADGES STRATÉGIQUES STRICTEMENT BINAIRES (FORT/FAIBLE) */
const renderBadge = (level: string) => {
  if (level === 'Fort' || level === 'Forte' || level === 'Critique') {
    return <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded font-bold text-[10px] uppercase border border-rose-200">Fort</span>;
  }
  return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-bold text-[10px] uppercase border border-slate-200">Faible</span>;
};

const getSmartActorDefaults = (category: string, name = '', title = '') => {
  const lowerName = (name + ' ' + title).toLowerCase();
  
  // 1. Les Partenaires Financiers (Bailleurs de fonds, Investisseurs, Auditeurs)
  if (category === 'PARTENAIRES FINANCIERS') {
    const isAuditor = lowerName.includes('audit') || lowerName.includes('institutionnel') || lowerName.includes('externe') || lowerName.includes('distant');
    if (isAuditor) {
      return {
        pouvoir: 'Fort',
        explicationPouvoir: "Grand pouvoir de sanction, de blocage ou d'audit de conformité globale.",
        influence: 'Faible',
        explicationInfluence: "Ne s'intéresse pas au contenu opérationnel du projet, mais uniquement au respect strict des ratios financiers et légaux.",
        planCommunication: "Maintenir satisfaits. Fournir des reportings de haut niveau sur la conformité légale et budgétaire. Éviter toute surcharge de détails opérationnels.",
        mission: "S'assurer de la conformité globale et du respect strict des normes de gestion et d'investissement."
      };
    }
    return {
      pouvoir: 'Fort',
      explicationPouvoir: "Le contrôle absolu des ressources stratégiques (financières) essentielles à la survie du projet.",
      influence: 'Fort',
      explicationInfluence: "Structurelle et hautement directive. Ils imposent des conditions (budgétaires, normes sociales et environnementales) et valident les grandes orientations.",
      planCommunication: "CONCEPTION : Gérer de près / Collaborer. Les impliquer étroitement pour valider la vision, le budget et le cadre logique. PLANIFICATION : Négocier et faire approuver les décaissements et les calendriers. EXÉCUTION / CLÔTURE : Les maintenir satisfaits en fournissant des reportings réguliers (trimestriels/annuels) sur l'avancement, les risques et l'atteinte des indicateurs de performance, afin de garantir la continuité du financement.",
      mission: "Assurer la viabilité financière, suivre l'atteinte des jalons clés et valider le rendement ainsi que la conformité budgétaire."
    };
  }
  
  // 2. Les Partenaires Techniques (Experts, Prestataires, Fournisseurs technologiques globaux)
  if (category === 'OPÉRATEURS TECHNIQUES') {
    const isGlobalProvider = lowerName.includes('cloud') || lowerName.includes('international') || lowerName.includes('logistique') || lowerName.includes('régulation');
    if (isGlobalProvider) {
      return {
        pouvoir: 'Fort',
        explicationPouvoir: "Services ou infrastructures technologiques absolument indispensables à la survie de votre projet.",
        influence: 'Faible',
        explicationInfluence: "Votre projet n'est qu'un client parmi d'autres ; très faible intérêt stratégique pour leur propre réussite interne.",
        planCommunication: "Maintenir satisfaits. Gestion purement contractuelle et administrative. Respect des paiements et des clauses sans les solliciter opérationnellement.",
        mission: "Fournir l'infrastructure, le logiciel ou le service global nécessaire au fonctionnement."
      };
    }
    return {
      pouvoir: 'Fort',
      explicationPouvoir: "La maîtrise d'un savoir, d'une expertise spécifique, ou d'une technologie incontournable.",
      influence: 'Fort',
      explicationInfluence: "Opérationnelle. Leur performance garantit la qualité des livrables et le respect des délais techniques.",
      planCommunication: "CONCEPTION : Consultés ponctuellement pour des études de faisabilité (tenir informés). PLANIFICATION : Les impliquer pour évaluer les coûts, les ressources techniques et définir les tâches. EXÉCUTION : Gérer de près (Collaborer activement). Leur rôle devient central. Il faut des réunions de coordination régulières et un suivi contractuel rigoureux. CLÔTURE : Assurer le transfert de compétences et la réception définitive des travaux.",
      mission: "Concevoir et développer les spécifications techniques, réaliser les livrables dans le respect du cahier des charges et transférer les compétences."
    };
  }
  
  // 3. Les Internes (Membres de l'organisation)
  if (category === 'INTERNE') {
    const isFinanceOrTopExec = lowerName.includes('financier') || lowerName.includes('daf') || lowerName.includes('daaf') || lowerName.includes('haute direction');
    const isDir = lowerName.includes('dir') || lowerName.includes('président') || lowerName.includes('cadre') || lowerName.includes('sponsor') || lowerName.includes('copil') || lowerName.includes('chef') || lowerName.includes('responsable');
    
    if (isFinanceOrTopExec) {
      return {
        pouvoir: 'Fort',
        explicationPouvoir: "Pouvoir absolu de valider, couper ou geler le budget du projet.",
        influence: 'Faible',
        explicationInfluence: "Ne participe pas au quotidien du projet et n'en utilise pas les livrables.",
        planCommunication: "Maintenir satisfaits. Transmettre des indicateurs clés (budget, délais). Ne surtout pas les noyer sous des détails opérationnels qui risqueraient de les agacer.",
        mission: "Allouer et sécuriser les ressources financières globales de l'organisation."
      };
    } else if (isDir) {
      return {
        pouvoir: 'Fort',
        explicationPouvoir: "Statut hiérarchique, mandat institutionnel et pouvoir décisionnel formel.",
        influence: 'Fort',
        explicationInfluence: "Fournit le leadership politique et managérial, valide l'alignement sur la vision globale et arbitre en dernier ressort les ressources.",
        planCommunication: "CONCEPTION : Gérer de près. Valider le projet dès le départ. PLANIFICATION / EXÉCUTION : Arbitrage de conflits et déblocage de ressources. CLÔTURE : Validation finale.",
        mission: "Piloter la gouvernance, porter la vision politique du projet, valider les choix d'investissements et mobiliser l'équipe."
      };
    } else {
      return {
        pouvoir: 'Faible',
        explicationPouvoir: "Maîtrise des procédures quotidiennes. Ils n'ont pas de pouvoir de décision globale, mais détiennent un fort pouvoir de freinage (résistance au changement).",
        influence: 'Fort',
        explicationInfluence: "Directe sur la vitesse de mise en œuvre et l'appropriation finale des nouveaux processus.",
        planCommunication: "PLANIFICATION & EXÉCUTION : Les tenir informés et les consulter. L'objectif est de réduire activement la résistance en les impliquant dans l'adaptation pratique des processus.",
        mission: "Mettre en œuvre les tâches quotidiennes du plan d'action, remonter les difficultés terrain et adopter de nouveaux processus."
      };
    }
  }

  // 4. Les Bénéficiaires (Utilisateurs finaux, populations locales cibles)
  if (category === 'BÉNÉFICIAIRES') {
    return {
      pouvoir: 'Faible',
      explicationPouvoir: "Légitimité morale ou sociale, ancrage local, et capacité à rejeter l'utilisation finale du produit ou service (pouvoir d'usage).",
      influence: 'Fort',
      explicationInfluence: "Influence d'usage et de validation. Le succès final du projet dépend de leur appropriation et de la résolution de leurs vrais problèmes.",
      planCommunication: "CONCEPTION : Les consulter activement (enquêtes, focus groups) pour évaluer leurs besoins réels et éviter une solution inadaptée. PLANIFICATION / EXÉCUTION : Les tenir informés et impliqués. Mettre en place des comités locaux pour maintenir l'adhésion. CLÔTURE : Mesurer l'adoption et organiser le transfert des acquis.",
      mission: "Exprimer les besoins locaux réels, évaluer la qualité d'usage des livrables et s'approprier les bénéfices du projet."
    };
  }
  
  // 5. Les Externes (Tutelles, Autorités, Médias, ONG, etc.)
  if (category === 'EXTERNE') {
    const isRegulatorOrMedia = lowerName.includes('autorité') || lowerName.includes('ministère') || lowerName.includes('réglementaire') || lowerName.includes('état') || lowerName.includes('presse') || lowerName.includes('média') || lowerName.includes('religieux') || lowerName.includes('traditionnel');
    if (isRegulatorOrMedia) {
      return {
        pouvoir: 'Fort',
        explicationPouvoir: "Capacité à délivrer des permis, des licences, ou fort pouvoir d'influence sur l'opinion publique et la réputation du projet.",
        influence: 'Faible',
        explicationInfluence: "Aucun intérêt personnel ou opérationnel direct dans le succès technique du projet.",
        planCommunication: "Maintenir satisfaits. Assurer une communication ciblée sur le respect des normes (légales, conformité) et l'impact global. Une mauvaise gestion les transforme en de redoutables opposants.",
        mission: "Garantir la conformité réglementaire ou assurer le relais d'opinion et la cohésion sociale."
      };
    }
    return {
      pouvoir: 'Faible',
      explicationPouvoir: "La capacité de mobilisation collective (pouvoir 'AVEC'), l'influence sur l'opinion publique ou les médias.",
      influence: 'Faible',
      explicationInfluence: "Indirecte et souvent défensive (risque de blocage, de plainte ou d'atteinte à la réputation).",
      planCommunication: "CONCEPTION & PLANIFICATION : Surveiller (effort minimal). Identifier leurs craintes potentielles (ex: impact environnemental). EXÉCUTION : S'ils subissent des nuisances, basculer sur 'Maintenir satisfaits' ou 'Tenir informés'. Mettre en place un Mécanisme de Gestion des Plaintes (MGP) pour capter et désamorcer les conflits.",
      mission: "Veille citoyenne d'opinion publique, signalement des risques de non-conformité sociétale ou environnementale."
    };
  }
  
  return { pouvoir: 'Faible', explicationPouvoir: '', influence: 'Faible', explicationInfluence: '', planCommunication: '', mission: '' };
};

const INITIAL_SAMPLE_DOSSIERS: Dossier[] = [
  {
    id: 'psd-demo-1',
    name: 'Programme de Transformation Numérique & Dématérialisation (PTND)',
    institution: 'Ministère du Plan & du Développement Économique',
    axes: [
      {
        id: 'axe-1',
        name: 'Axe 1 : Modernisation des Systèmes & Dématérialisation des Démarches',
        projects: [
          {
            id: 'proj-1',
            name: 'Projet Guichet Unique Citoyen en Ligne',
            tasks: [
              {
                id: 't-1',
                phase: 'CONCEPTION',
                name: 'Cadrage fonctionnel et validation de la feuille de route stratégique',
                status: 'Terminé',
                raci: { R: 'Chef de Projet SI', A: 'Directeur Général SI', C: 'Usagers & Citoyens', I: 'Bailleur de Fonds (AFD)' }
              },
              {
                id: 't-2',
                phase: 'PLANIFICATION',
                name: 'Arbitrage budgétaire et négociation des tranches de financement',
                status: 'Terminé',
                raci: { R: 'Direction Financière (DAF)', A: 'Bailleur de Fonds (AFD)', C: 'Chef de Projet SI', I: 'Autorité de Régulation' }
              },
              {
                id: 't-3',
                phase: 'EXÉCUTION & SUIVI',
                name: 'Développement de l\'API d\'authentification sécurisée',
                status: 'En cours',
                raci: { R: 'Prestataire Cloud & Sécurité', A: 'Chef de Projet SI', C: 'Direction Financière (DAF)', I: 'Usagers & Citoyens' }
              },
              {
                id: 't-4',
                phase: 'EXÉCUTION & SUIVI',
                name: 'Audit de conformité RGPD et sécurité des données personnelles',
                status: 'À faire',
                raci: { R: 'Auditeur Externe Indépendant', A: 'Autorité de Régulation', C: 'Prestataire Cloud & Sécurité', I: 'Directeur Général SI' }
              },
              {
                id: 't-5',
                phase: 'CLÔTURE',
                name: 'Validation finale de la recette technique et bilan d\'impact citoyen',
                status: 'À faire',
                raci: { R: 'Chef de Projet SI', A: 'Directeur Général SI', C: 'Usagers & Citoyens', I: 'Bailleur de Fonds (AFD)' }
              }
            ]
          }
        ]
      },
      {
        id: 'axe-2',
        name: 'Axe 2 : Conduite du Changement & Résilience Opérationnelle',
        projects: [
          {
            id: 'proj-2',
            name: 'Projet Formation des Agents & Gestion de la Transition',
            tasks: [
              {
                id: 't-6',
                phase: 'PLANIFICATION',
                name: 'Plan de formation des 500 agents administratifs',
                status: 'En cours',
                raci: { R: 'Responsable Conduite du Changement', A: 'Directeur Général SI', C: 'Agents Opérationnels', I: 'Direction Financière (DAF)' }
              },
              {
                id: 't-7',
                phase: 'EXÉCUTION & SUIVI',
                name: 'Ateliers pilotes d\'appropriation des nouveaux outils',
                status: 'À faire',
                raci: { R: 'Agents Opérationnels', A: 'Responsable Conduite du Changement', C: 'Chef de Projet SI', I: 'Directeur Général SI' }
              }
            ]
          }
        ]
      }
    ],
    stakeholders: [
      {
        id: 'sh-1',
        projectId: 'proj-1',
        category: 'BÉNÉFICIAIRES',
        name: 'Usagers & Citoyens',
        title: 'Bénéficiaires Directs des Services en Ligne',
        mission: 'Exprimer les besoins locaux réels, évaluer la qualité d\'usage des livrables et s\'approprier les bénéfices du projet.',
        pouvoir: 'Faible',
        explicationPouvoir: 'Légitimité morale ou sociale, ancrage local, et capacité à rejeter l\'utilisation finale du produit ou service (pouvoir d\'usage).',
        influence: 'Fort',
        explicationInfluence: 'Influence d\'usage et de validation. Le succès final du projet dépend de leur appropriation et de la résolution de leurs vrais problèmes.',
        planCommunication: 'CONCEPTION : Les consulter activement (enquêtes, focus groups) pour évaluer leurs besoins réels et éviter une solution inadaptée. PLANIFICATION / EXÉCUTION : Les tenir informés et impliqués. Mettre en place des comités locaux pour maintenir l\'adhésion. CLÔTURE : Mesurer l\'adoption et organiser le transfert des acquis.'
      },
      {
        id: 'sh-2',
        projectId: 'proj-1',
        category: 'INTERNE',
        name: 'Directeur Général SI',
        title: 'Directeur / Sponsor Stratégique',
        mission: 'Piloter la gouvernance, porter la vision politique du projet, valider les choix d\'investissements et mobiliser l\'équipe.',
        pouvoir: 'Fort',
        explicationPouvoir: 'Statut hiérarchique, mandat institutionnel et pouvoir décisionnel formel.',
        influence: 'Fort',
        explicationInfluence: 'Fournit le leadership politique et managérial, valide l\'alignement sur la vision globale et arbitre en dernier ressort les ressources.',
        planCommunication: 'CONCEPTION : Gérer de près. Valider le projet dès le départ. PLANIFICATION / EXÉCUTION : Arbitrage de conflits et déblocage de ressources. CLÔTURE : Validation finale.'
      },
      {
        id: 'sh-3',
        projectId: 'proj-1',
        category: 'PARTENAIRES FINANCIERS',
        name: 'Bailleur de Fonds (AFD)',
        title: 'Partenaire Financier International',
        mission: 'Assurer la viabilité financière, suivre l\'atteinte des jalons clés et valider le rendement ainsi que la conformité budgétaire.',
        pouvoir: 'Fort',
        explicationPouvoir: 'Le contrôle absolu des ressources stratégiques (financières) essentielles à la survie du projet.',
        influence: 'Fort',
        explicationInfluence: 'Structurelle et hautement directive. Ils imposent des conditions (budgétaires, normes sociales et environnementales) et valident les grandes orientations.',
        planCommunication: 'CONCEPTION : Gérer de près / Collaborer. Les impliquer étroitement pour valider la vision, le budget et le cadre logique. PLANIFICATION : Négocier et faire approuver les décaissements et les calendriers. EXÉCUTION / CLÔTURE : Les maintenir satisfaits en fournissant des reportings réguliers sur l\'avancement et les risques.'
      },
      {
        id: 'sh-4',
        projectId: 'proj-1',
        category: 'OPÉRATEURS TECHNIQUES',
        name: 'Prestataire Cloud & Sécurité',
        title: 'Opérateur Technique Expert',
        mission: 'Concevoir et développer les spécifications techniques, réaliser les livrables dans le respect du cahier des charges et transférer les compétences.',
        pouvoir: 'Fort',
        explicationPouvoir: 'La maîtrise d\'un savoir, d\'une expertise spécifique, ou d\'une technologie incontournable.',
        influence: 'Fort',
        explicationInfluence: 'Opérationnelle. Leur performance garantit la qualité des livrables et le respect des délais techniques.',
        planCommunication: 'CONCEPTION : Consultés pour études de faisabilité. PLANIFICATION : Évaluer les coûts et tâches. EXÉCUTION : Gérer de près (Collaborer activement avec réunions hebdos). CLÔTURE : Transfert des compétences.'
      },
      {
        id: 'sh-5',
        projectId: 'proj-1',
        category: 'EXTERNE',
        name: 'Autorité de Régulation',
        title: 'Régulateur National des Données',
        mission: 'Garantir la conformité réglementaire ou assurer le relais d\'opinion et la cohésion sociale.',
        pouvoir: 'Fort',
        explicationPouvoir: 'Capacité à délivrer des permis, des licences, ou fort pouvoir d\'influence légale.',
        influence: 'Faible',
        explicationInfluence: 'Aucun intérêt personnel ou opérationnel direct dans le succès technique du projet.',
        planCommunication: 'Maintenir satisfaits. Assurer une communication ciblée sur le respect des normes (légales, conformité) et l\'impact global.'
      },
      {
        id: 'sh-6',
        projectId: 'proj-2',
        category: 'INTERNE',
        name: 'Agents Opérationnels',
        title: 'Utilisateurs Internes / Agents de Guichet',
        mission: 'Mettre en œuvre les tâches quotidiennes du plan d\'action, remonter les difficultés terrain et adopter de nouveaux processus.',
        pouvoir: 'Faible',
        explicationPouvoir: 'Maîtrise des procédures quotidiennes. Fort pouvoir de freinage (résistance au changement).',
        influence: 'Fort',
        explicationInfluence: 'Directe sur la vitesse de mise en œuvre et l\'appropriation finale des nouveaux processus.',
        planCommunication: 'PLANIFICATION & EXÉCUTION : Les tenir informés et les consulter. Réduire la résistance en les impliquant dans l\'adaptation pratique des processus.'
      }
    ]
  }
];

function MainApp() {
  const [activeTab, setActiveTab] = useState<'dossiers' | 'registre_stakeholders' | 'psd' | 'workflows' | 'power_matrix' | 'decision_matrix' | 'stakeholders'>('dossiers'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProgramOpened, setIsProgramOpened] = useState(false);
  
  // Persistence via localStorage avec repli sur données de démonstration
  const [data, setData] = useState<Dossier[]>(() => {
    try {
      const saved = localStorage.getItem('pgs_dossiers_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Erreur chargement localStorage :", e);
    }
    return INITIAL_SAMPLE_DOSSIERS;
  });

  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(() => {
    return data.length > 0 ? data[0].id : null;
  });

  useEffect(() => {
    try {
      localStorage.setItem('pgs_dossiers_v2', JSON.stringify(data));
    } catch (e) {
      console.warn("Erreur sauvegarde localStorage :", e);
    }
  }, [data]);
  
  const [activeStakeholderTab, setActiveStakeholderTab] = useState('ALL');
  const [workflowAxeId, setWorkflowAxeId] = useState('FULL');
  const [workflowProjId, setWorkflowProjId] = useState('FULL');
  const [powerMatrixAxeId, setPowerMatrixAxeId] = useState('FULL');
  const [powerMatrixProjId, setPowerMatrixProjId] = useState('FULL');
  const [decisionMatrixAxeId, setDecisionMatrixAxeId] = useState('FULL');
  const [decisionMatrixProjId, setDecisionMatrixProjId] = useState('FULL');
  const [stakeholderAxeId, setStakeholderAxeId] = useState('FULL');
  const [stakeholderProjId, setStakeholderProjId] = useState('FULL');
  
  const [editorAxeId, setEditorAxeId] = useState('FULL');
  const [editorProjId, setEditorProjId] = useState('FULL');
  const [registryAxeId, setRegistryAxeId] = useState('FULL');
  const [registryProjId, setRegistryProjId] = useState('FULL');
  const [registrySubTab, setRegistrySubTab] = useState('BÉNÉFICIAIRES');

  const [modalActorId, setModalActorId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; action: (() => void) | null; message: string }>({
    isOpen: false,
    action: null,
    message: ''
  });

  const confirmDelete = (action: () => void, message: string) => {
    setDeleteModal({ isOpen: true, action, message });
  };

  useEffect(() => {
    setWorkflowAxeId('FULL'); setWorkflowProjId('FULL');
    setPowerMatrixAxeId('FULL'); setPowerMatrixProjId('FULL');
    setDecisionMatrixAxeId('FULL'); setDecisionMatrixProjId('FULL');
    setStakeholderAxeId('FULL'); setStakeholderProjId('FULL');
    setEditorAxeId('FULL'); setEditorProjId('FULL');
    setRegistryAxeId('FULL'); setRegistryProjId('FULL');
  }, [selectedDossierId]);

  const activeDossier = useMemo(() => 
    data.find(d => d.id === selectedDossierId) || null, 
  [data, selectedDossierId]);

  const activeDossierTasks = useMemo(() => {
    return activeDossier?.axes?.flatMap(a => 
      a.projects?.flatMap(p => 
        p.tasks?.map(t => ({ ...t, axeName: a.name, projectName: p.name, axeId: a.id, projectId: p.id })) || []
      ) || []
    ) || [];
  }, [activeDossier]);

  const activeProjects = useMemo(() => {
    const projects: Array<Project & { dossierName: string; axeName: string; axeId: string }> = [];
    if (activeDossier && Array.isArray(activeDossier.axes)) {
      activeDossier.axes.forEach(axe => {
        if (Array.isArray(axe.projects)) {
          axe.projects.forEach(proj => {
            projects.push({ ...proj, dossierName: activeDossier.name, axeName: axe.name, axeId: axe.id });
          });
        }
      });
    }
    return projects;
  }, [activeDossier]);

  const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  /* CRUD DU PORTEFEUILLE INSTITUTIONNEL */
  const addDossier = () => {
    const newId = generateId('psd');
    const newDossier: Dossier = {
      id: newId,
      name: 'Nouveau Programme Stratégique',
      institution: 'Nouvelle Institution',
      stakeholders: [],
      axes: []
    };
    setData([newDossier, ...data]);
    setSelectedDossierId(newId);
    setIsProgramOpened(true);
    setActiveTab('psd');
  };

  const resetToSampleData = () => {
    confirmDelete(() => {
      setData(INITIAL_SAMPLE_DOSSIERS);
      setSelectedDossierId(INITIAL_SAMPLE_DOSSIERS[0].id);
      setIsProgramOpened(false);
      setActiveTab('dossiers');
    }, "Réinitialiser l'application avec les données exemplaires de démonstration ? Vos modifications actuelles seront remplacées.");
  };

  const exportToJson = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `gouvernance_strategique_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const updateDossierName = (id: string, newName: string) => {
    setData(data.map(d => d.id === id ? { ...d, name: newName } : d));
  };
  const updateDossierInstitution = (id: string, newInstitution: string) => {
    setData(data.map(d => d.id === id ? { ...d, institution: newInstitution } : d));
  };
  const deleteDossier = (id: string) => {
    const newData = data.filter(d => d.id !== id);
    setData(newData);
    if (selectedDossierId === id) {
      if (newData.length > 0) {
        setSelectedDossierId(newData[0].id);
      } else {
        setSelectedDossierId(null);
        setIsProgramOpened(false);
        setActiveTab('dossiers');
      }
    }
  };

  const addAxe = (psdId: string) => {
    setData(data.map(d => d.id === psdId ? { ...d, axes: [...(d.axes||[]), { id: generateId('axe'), name: 'Nouvel Axe Stratégique', projects: [] }] } : d));
    setEditorAxeId('FULL'); 
  };
  const updateAxeName = (psdId: string, axeId: string, value: string) => {
    setData(data.map(d => d.id === psdId ? { ...d, axes: d.axes.map(a => a.id === axeId ? { ...a, name: value } : a) } : d));
  };
  const deleteAxe = (psdId: string, axeId: string) => {
    setData(data.map(d => d.id === psdId ? { ...d, axes: d.axes.filter(a => a.id !== axeId) } : d));
  };

  const addProject = (psdId: string, axeId: string) => {
    setData(data.map(d => d.id === psdId ? { ...d, axes: d.axes.map(a => a.id === axeId ? { ...a, projects: [...(a.projects||[]), { id: generateId('proj'), name: 'Nouveau Projet', tasks: [] }] } : a) } : d));
    setEditorAxeId(axeId); 
    setEditorProjId('FULL'); 
  };
  const updateProjectName = (psdId: string, axeId: string, projId: string, newName: string) => {
    setData(data.map(d => d.id === psdId ? { ...d, axes: d.axes.map(a => a.id === axeId ? { ...a, projects: a.projects.map(p => p.id === projId ? { ...p, name: newName } : p) } : a) } : d));
  };
  const deleteProject = (psdId: string, axeId: string, projId: string) => {
    setData(data.map(d => d.id === psdId ? { ...d, axes: d.axes.map(a => a.id === axeId ? { ...a, projects: a.projects.filter(p => p.id !== projId) } : a) } : d));
  };

  const addTask = (psdId: string, axeId: string, projId: string) => {
    setData(data.map(d => d.id === psdId ? { ...d, axes: d.axes.map(a => a.id === axeId ? { ...a, projects: a.projects.map(p => p.id === projId ? { ...p, tasks: [...(p.tasks||[]), { id: generateId('t'), phase: 'EXÉCUTION & SUIVI', name: '', status: 'À faire', raci: { R: '', A: '', C: '', I: '' } }] } : p) } : a) } : d));
  };
  
  const updateTask = (psdId: string, axeId: string, projId: string, taskId: string, field: string, value: string) => {
    const finalValue = (field.startsWith('raci.') && value === 'Autre (Préciser...)') ? '' : value;
    setData(data.map(d => d.id === psdId ? { ...d, axes: d.axes.map(a => a.id === axeId ? { ...a, projects: a.projects.map(p => p.id === projId ? { ...p, tasks: p.tasks.map(t => {
      if (t.id !== taskId) return t;
      if (field.startsWith('raci.')) {
        const raciField = field.split('.')[1] as 'R' | 'A' | 'C' | 'I';
        return { ...t, raci: { ...t.raci, [raciField]: finalValue } };
      }
      return { ...t, [field]: finalValue };
    }) } : p) } : a) } : d));
  };

  const deleteTask = (psdId: string, axeId: string, projId: string, taskId: string) => {
    setData(data.map(d => d.id === psdId ? { ...d, axes: d.axes.map(a => a.id === axeId ? { ...a, projects: a.projects.map(p => p.id === projId ? { ...p, tasks: p.tasks.filter(t => t.id !== taskId) } : p) } : a) } : d));
  };

  const handleAddStakeholderToProject = (projId: string, category: string) => {
    const defaults = getSmartActorDefaults(category, "Nouvel acteur", "");
    const newActor: Stakeholder = {
        id: generateId('sh'),
        projectId: projId,
        category: category,
        name: '',
        title: '',
        mission: defaults.mission,
        pouvoir: defaults.pouvoir,
        explicationPouvoir: defaults.explicationPouvoir,
        influence: defaults.influence,
        explicationInfluence: defaults.explicationInfluence,
        planCommunication: defaults.planCommunication
    };
    setData(data.map(d => d.id === selectedDossierId ? { ...d, stakeholders: [...(d.stakeholders||[]), newActor] } : d));
  };

  const handleUpdateStakeholder = (actorId: string, field: string, value: string) => {
    setData(data.map(d => d.id === selectedDossierId ? {
        ...d,
        stakeholders: (d.stakeholders||[]).map(s => s.id === actorId ? { ...s, [field]: value } : s)
    } : d));
  };

  const handleDeleteStakeholder = (actorId: string) => {
    setData(data.map(d => d.id === selectedDossierId ? {
        ...d,
        stakeholders: (d.stakeholders||[]).filter(s => s.id !== actorId)
    } : d));
  };

  /* INTERFACE D'ACCUEIL DES DOSSIERS DE GOUVERNANCE */
  const renderDossiers = () => (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4 border-indigo-100 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <Folder className="w-6 h-6 mr-2 text-indigo-600" /> 
            Gestion des Dossiers Stratégiques
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gérez vos programmes institutionnels, portefeuilles de projets et schémas directeurs.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={resetToSampleData} 
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-bold border border-slate-300 shadow-sm flex items-center transition-colors"
            title="Charger un jeu de données exemple"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-slate-600" /> Données Démo
          </button>
          <button 
            onClick={exportToJson} 
            className="bg-white hover:bg-slate-50 text-indigo-700 px-3.5 py-2 rounded-lg text-xs font-bold border border-indigo-200 shadow-sm flex items-center transition-colors"
            title="Exporter l'ensemble de vos dossiers au format JSON"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Exporter JSON
          </button>
          <button onClick={addDossier} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center transition-colors">
            <Plus className="w-4 h-4 mr-1.5" /> Créer un nouveau Dossier
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {data.length === 0 && (
           <div className="col-span-full py-20 text-center bg-white border border-dashed border-slate-300 rounded-2xl p-6">
              <Folder className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-bold mb-2">Aucun dossier n'a été créé.</p>
              <p className="text-slate-400 text-xs mb-6">Commencez par créer votre premier dossier ou rechargez les données d'exemple.</p>
              <div className="flex justify-center gap-3">
                <button onClick={addDossier} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow">
                  Créer un Dossier
                </button>
                <button onClick={resetToSampleData} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold border border-slate-300">
                  Charger Démo
                </button>
              </div>
           </div>
        )}
        {data.map((dossier) => {
          const totalAxes = dossier.axes?.length || 0;
          const totalProjects = dossier.axes?.reduce((acc, a) => acc + (a.projects?.length || 0), 0) || 0;
          const totalActors = dossier.stakeholders?.length || 0;
          const isSelected = selectedDossierId === dossier.id;

          return (
            <div key={dossier.id} className={`bg-white rounded-xl shadow-sm border-l-4 ${isSelected ? 'border-l-indigo-600 ring-2 ring-indigo-500/20' : 'border-l-emerald-500'} border-y border-r border-slate-200 p-5 flex flex-col justify-between hover:shadow-md transition-shadow group relative`}>
              <div>
                 <div className="flex justify-between items-start mb-4">
                   <div className="w-12 h-12 rounded-xl flex items-center justify-center text-emerald-600 mb-2 shadow-sm bg-emerald-50 border border-emerald-100">
                     <Briefcase className="w-6 h-6" />
                   </div>
                   <div className="flex items-center space-x-2">
                     <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-1 rounded uppercase tracking-wider">ÉDITABLE</span>
                     <button onClick={() => confirmDelete(() => deleteDossier(dossier.id), "Voulez-vous vraiment supprimer ce dossier de façon permanente ?")} className="text-slate-300 hover:text-rose-500 transition-colors p-1" title="Supprimer ce dossier">
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
                 
                 <div className="mb-4 space-y-3">
                   <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 border-b border-dashed border-slate-200 pb-1">
                        INSTITUTION OU ORGANISME
                      </label>
                      <input 
                        className="font-bold text-base text-slate-800 bg-transparent outline-none w-full placeholder:text-slate-300 focus:border-b focus:border-indigo-500" 
                        value={dossier.institution || ''} 
                        onChange={(e) => updateDossierInstitution(dossier.id, e.target.value)} 
                        placeholder="Nom de l'institution..."
                      />
                   </div>
                   <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 border-b border-dashed border-slate-200 pb-1">
                        SERVICE / TITRE DU DOSSIER
                      </label>
                      <input 
                        className="font-medium text-sm text-slate-600 bg-transparent outline-none w-full placeholder:text-slate-300 focus:border-b focus:border-indigo-500" 
                        value={dossier.name || ''} 
                        onChange={(e) => updateDossierName(dossier.id, e.target.value)} 
                        placeholder="Nom du service..."
                      />
                   </div>
                 </div>

                 {/* Synthèse rapide des éléments du dossier */}
                 <div className="grid grid-cols-3 gap-2 py-3 border-t border-slate-100 text-center mb-3">
                   <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                     <div className="text-xs font-bold text-slate-700">{totalAxes}</div>
                     <div className="text-[9px] text-slate-400 uppercase font-semibold">Axes</div>
                   </div>
                   <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                     <div className="text-xs font-bold text-slate-700">{totalProjects}</div>
                     <div className="text-[9px] text-slate-400 uppercase font-semibold">Projets</div>
                   </div>
                   <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                     <div className="text-xs font-bold text-slate-700">{totalActors}</div>
                     <div className="text-[9px] text-slate-400 uppercase font-semibold">Acteurs</div>
                   </div>
                 </div>
              </div>
              
              <button 
                onClick={() => {
                  setSelectedDossierId(dossier.id);
                  setIsProgramOpened(true);
                  setActiveTab('registre_stakeholders');
                }} 
                className="w-full py-2.5 font-bold text-sm rounded-lg transition-colors flex items-center justify-center bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm mt-2"
              >
                <Target className="w-4 h-4 mr-2" /> Ouvrir le Dossier
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  /* ENREGISTREMENT ET CLASSIFICATION INITIALE DES ACTEURS PAR PROJET */
  const renderRegistrePartiesPrenantes = () => {
    if (!activeDossier) return <div className="p-10 text-center text-slate-500">Veuillez ouvrir un dossier depuis l'onglet Dossiers.</div>;

    const currentStakeholders = activeDossier.stakeholders || [];
    let axesToRender = activeDossier.axes || [];
    
    if (registryAxeId !== 'FULL') {
        axesToRender = axesToRender.filter(a => a.id === registryAxeId);
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 shrink-0">
                <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center">
                      <Filter className="w-3 h-3 mr-1" /> 1. Filtrer par Axe
                    </label>
                    <div className="relative">
                        <select className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-800 text-sm font-bold rounded-lg focus:ring-2 focus:ring-indigo-500 p-2.5 pr-8 outline-none cursor-pointer" value={registryAxeId} onChange={(e) => { setRegistryAxeId(e.target.value); setRegistryProjId('FULL'); }}>
                            <option value="FULL">Tous les axes (Vue globale)</option>
                            {activeDossier?.axes?.map(axe => <option key={`reg-axe-${axe.id}`} value={axe.id}>{axe.name}</option>)}
                        </select>
                        <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-3 rotate-90 pointer-events-none" />
                    </div>
                </div>
                <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center">
                      <Filter className="w-3 h-3 mr-1" /> 2. Filtrer par Projet
                    </label>
                    <div className="relative">
                        <select className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-800 text-sm font-bold rounded-lg focus:ring-2 focus:ring-indigo-500 p-2.5 pr-8 outline-none disabled:opacity-50 cursor-pointer" value={registryProjId} onChange={(e) => setRegistryProjId(e.target.value)} disabled={registryAxeId === 'FULL'}>
                            <option value="FULL">Sélectionnez d'abord un axe...</option>
                            {activeDossier?.axes?.find(a => a.id === registryAxeId)?.projects?.map(proj => <option key={`reg-proj-${proj.id}`} value={proj.id}>{proj.name}</option>)}
                        </select>
                        <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-3 rotate-90 pointer-events-none" />
                    </div>
                </div>
            </div>

            <div className="bg-[#eff6ff] border border-blue-200 rounded-xl p-5 flex items-center gap-5 shadow-sm">
                <div className="w-14 h-14 bg-blue-100/70 rounded-full flex items-center justify-center shrink-0 text-blue-600 border border-blue-200/50">
                    <BookOpen className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-indigo-950 uppercase tracking-wide">IDENTIFICATION DES PARTIES PRENANTES</h2>
                    <p className="text-sm text-blue-700 font-semibold mt-1">
                        Répertoriez et catégorisez les acteurs en amont (Phase Préparatoire) avant leur évaluation stratégique dans l'Analyse des concernés.
                    </p>
                </div>
            </div>

            <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white">
                <div className="bg-[#1e293b] flex flex-wrap border-b border-slate-700">
                    {['BÉNÉFICIAIRES', 'INTERNE', 'EXTERNE', 'OPÉRATEURS TECHNIQUES', 'PARTENAIRES FINANCIERS'].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setRegistrySubTab(cat)}
                            className={`px-6 py-3.5 text-xs font-black uppercase tracking-wider transition-colors border-r border-slate-700/50 ${registrySubTab === cat ? 'bg-slate-800 text-white shadow-inner border-b-2 border-b-indigo-500' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="bg-white min-h-[400px]">
                    {axesToRender.length === 0 && (
                        <div className="p-12 flex flex-col items-center text-slate-400">
                            <FolderTree className="w-12 h-12 mb-3 text-slate-200" />
                            <p className="font-medium text-sm">Veuillez d'abord créer des axes et des projets dans le Programme (PSD).</p>
                            <button onClick={() => setActiveTab('psd')} className="mt-4 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs">
                              Aller au Programme (PSD)
                            </button>
                        </div>
                    )}
                    
                    {axesToRender.map(axe => {
                        let projectsToRender = axe.projects || [];
                        if (registryProjId !== 'FULL') projectsToRender = projectsToRender.filter(p => p.id === registryProjId);

                        return (
                            <div key={axe.id} className="border-b border-slate-200 last:border-0">
                                <div className="bg-[#f8fafc] px-5 py-3 border-b border-slate-200 font-black text-slate-800 uppercase tracking-widest text-sm shadow-sm flex items-center justify-between">
                                    <span>{axe.name || 'AXE SANS NOM'}</span>
                                    <span className="text-[10px] text-slate-400 font-normal">{projectsToRender.length} projet(s)</span>
                                </div>
                                
                                {projectsToRender.length === 0 && <div className="p-4 text-xs text-slate-400 italic bg-white">Aucun projet défini sous cet axe.</div>}
                                
                                {projectsToRender.map(proj => {
                                    const projActors = currentStakeholders.filter(s => s.projectId === proj.id && s.category === registrySubTab);

                                    return (
                                        <div key={proj.id} className="border-b border-slate-100 last:border-0">
                                            <div className="bg-white px-5 py-2.5 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                                <span>PROJET : {proj.name || 'PROJET SANS NOM'}</span>
                                                <span className="text-slate-400 font-normal">{projActors.length} acteur(s) ({registrySubTab})</span>
                                            </div>
                                            
                                            <div className="p-5 flex gap-4 overflow-x-auto bg-[#fafafa]">
                                                {projActors.map(actor => (
                                                    <div key={actor.id} className="border border-slate-200 bg-white rounded-md p-3 min-w-[280px] w-[280px] flex flex-col shrink-0 shadow-sm relative group">
                                                        <button onClick={() => confirmDelete(() => handleDeleteStakeholder(actor.id), "Retirer cet acteur du projet ?")} className="absolute -top-2 -right-2 bg-rose-100 text-rose-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm border border-rose-200">
                                                            <X className="w-3.5 h-3.5"/>
                                                        </button>
                                                        
                                                        <textarea
                                                            className="w-full h-[72px] bg-[#fff9e6] border border-amber-200/70 rounded-md p-2.5 text-sm text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none placeholder:text-amber-700/30 leading-snug"
                                                            placeholder="Nom de l'acteur..."
                                                            value={actor.name}
                                                            onChange={(e) => handleUpdateStakeholder(actor.id, 'name', e.target.value)}
                                                        />
                                                        
                                                        <div className="mt-2 text-[10px] text-slate-500 truncate font-medium">
                                                          {actor.title || 'Fonction non précisée'}
                                                        </div>

                                                        <button onClick={() => setModalActorId(actor.id)} className="mt-3 w-full py-1.5 border border-dashed border-slate-300 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded hover:bg-slate-50 transition-colors flex items-center justify-center">
                                                            <Plus className="w-3 h-3 mr-1" /> {actor.title ? 'MODIFIER DÉTAILS' : 'AJOUTER DÉTAILS'}
                                                        </button>
                                                    </div>
                                                ))}
                                                
                                                <button onClick={() => handleAddStakeholderToProject(proj.id, registrySubTab)} className="border border-dashed border-slate-300 bg-white rounded-md min-w-[280px] w-[280px] flex items-center justify-center text-slate-400 font-black text-[10px] uppercase tracking-widest py-8 hover:bg-slate-50 transition-colors shrink-0 shadow-sm">
                                                    <Plus className="w-4 h-4 mr-1.5" /> AJOUTER UN ACTEUR
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
  };

  /* ÉDITEUR DES AXES, PROJETS ET ACTIONS EN MATRICE RACI */
  const renderPsdEditor = () => {
    if (!activeDossier) return <div className="p-10 text-center text-slate-500">Veuillez ouvrir un programme depuis l'onglet Dossiers.</div>;

    let axesToRender = activeDossier.axes || [];
    if (editorAxeId !== 'FULL') {
      axesToRender = axesToRender.filter(a => a.id === editorAxeId);
    }

    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3 border-indigo-100 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              <Map className="w-6 h-6 mr-2 text-indigo-600" /> 
              Programme Opérationnel (Plan Stratégique de Développement - PSD)
            </h2>
            <p className="text-xs text-slate-500 mt-1">Définissez vos axes stratégiques, vos projets et l'assignation RACI des actions.</p>
          </div>
          <button onClick={() => addAxe(activeDossier.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center transition-colors">
            <Plus className="w-4 h-4 mr-2" /> Ajouter un Axe Stratégique
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 shrink-0">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center">
              <Filter className="w-3 h-3 mr-1" /> 1. Filtrer par Axe
            </label>
            <div className="relative">
              <select className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-800 text-sm font-medium rounded-lg focus:ring-2 focus:ring-indigo-500 p-2.5 pr-8 outline-none cursor-pointer" value={editorAxeId} onChange={(e) => { setEditorAxeId(e.target.value); setEditorProjId('FULL'); }}>
                <option value="FULL">-- Afficher tout le programme --</option>
                {activeDossier?.axes?.map(axe => <option key={`ed-axe-${axe.id}`} value={axe.id}>{axe.name}</option>)}
              </select>
              <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-3 rotate-90 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center">
              <Filter className="w-3 h-3 mr-1" /> 2. Filtrer par Projet
            </label>
            <div className="relative">
              <select className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-800 text-sm font-medium rounded-lg focus:ring-2 focus:ring-indigo-500 p-2.5 pr-8 outline-none disabled:opacity-50 cursor-pointer" value={editorProjId} onChange={(e) => setEditorProjId(e.target.value)} disabled={editorAxeId === 'FULL'}>
                <option value="FULL">-- Tous les projets de l'axe --</option>
                {activeDossier?.axes?.find(a => a.id === editorAxeId)?.projects?.map(proj => <option key={`ed-proj-${proj.id}`} value={proj.id}>{proj.name}</option>)}
              </select>
              <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-3 rotate-90 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {(!activeDossier?.axes || activeDossier.axes.length === 0) && (
            <div className="text-center bg-white border border-dashed border-slate-300 rounded-xl py-12 text-slate-500">
              <p className="font-semibold mb-2">Aucun axe n'a été défini dans ce programme.</p>
              <button onClick={() => addAxe(activeDossier.id)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold">
                Créer le premier axe
              </button>
            </div>
          )}
          
          {axesToRender.map((axe) => {
            const originalIndex = activeDossier?.axes?.findIndex(a => a.id === axe.id) ?? 0;
            
            let projectsToRender = axe.projects || [];
            if (editorProjId !== 'FULL') {
              projectsToRender = projectsToRender.filter(p => p.id === editorProjId);
            }

            return (
            <div key={axe.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden group/axe">
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center flex-1 max-w-2xl">
                  <div className="w-8 h-8 rounded bg-indigo-100 text-indigo-700 font-black flex items-center justify-center mr-3 shrink-0">{originalIndex + 1}</div>
                  <div className="flex items-center w-full">
                    <input 
                      className="font-bold text-slate-800 text-base bg-white border border-dashed border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none w-full px-2 py-1 rounded transition-colors" 
                      value={axe.name} 
                      onChange={(e) => updateAxeName(activeDossier.id, axe.id, e.target.value)} 
                      placeholder="Intitulé de l'axe stratégique..."
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => addProject(activeDossier.id, axe.id)} className="text-xs bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center shadow-sm">
                    <Plus className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Projet
                  </button>
                  <button onClick={() => confirmDelete(() => deleteAxe(activeDossier.id, axe.id), "Voulez-vous vraiment supprimer cet axe stratégique et tous les projets qu'il contient ?")} className="text-slate-300 hover:text-rose-500 p-1.5 rounded transition-colors opacity-0 group-hover/axe:opacity-100" title="Supprimer cet axe">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {(!projectsToRender || projectsToRender.length === 0) && (
                  <div className="text-center text-slate-400 text-xs italic py-2">
                    Aucun projet défini. Cliquez sur "+ Projet" ci-dessus pour en ajouter un.
                  </div>
                )}
                {projectsToRender.map((proj) => (
                  <div key={proj.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 relative group/proj">
                    <button onClick={() => confirmDelete(() => deleteProject(activeDossier.id, axe.id, proj.id), "Voulez-vous vraiment supprimer ce projet et toutes ses actions ?")} className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 p-1.5 rounded-md opacity-0 group-hover/proj:opacity-100 transition-all z-10" title="Supprimer ce projet">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    
                    <div className="flex items-start pr-8">
                      <Edit3 className="w-4 h-4 text-indigo-400 mr-2 mt-0.5 shrink-0" />
                      <textarea 
                        className="font-bold text-slate-700 text-sm bg-white border border-slate-200 outline-none w-full resize-none focus:ring-1 focus:ring-indigo-400 rounded p-1.5 transition-colors" 
                        rows={1}
                        value={proj.name} 
                        onChange={(e) => updateProjectName(activeDossier.id, axe.id, proj.id, e.target.value)} 
                        placeholder="Nom du projet opérationnel..."
                      />
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="font-bold text-xs text-indigo-800 uppercase tracking-wider flex items-center">
                          <ListTodo className="w-3.5 h-3.5 mr-1.5 text-indigo-500" /> Actions & Matrice RACI
                        </h5>
                        <button onClick={() => addTask(activeDossier.id, axe.id, proj.id)} className="text-[10px] bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold px-2 py-1 rounded-lg flex items-center transition-colors shadow-sm">
                          <Plus className="w-3 h-3 mr-1" /> Ajouter Action
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        {(!proj.tasks || proj.tasks.length === 0) && (
                          <div className="text-center text-[10px] text-slate-400 italic py-2 bg-white rounded border border-dashed border-slate-200">
                            Saisissez ici les actions et assignez les acteurs (R, A, C, I) pour générer les matrices.
                          </div>
                        )}
                        {proj.tasks?.map((task) => (
                          <div key={task.id} className="flex flex-col xl:flex-row items-start xl:items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm group/task">
                            <div className="flex-1 flex flex-wrap sm:flex-nowrap w-full gap-2">
                              <select 
                                className="w-32 bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[10px] font-bold text-slate-600 outline-none focus:border-indigo-400 cursor-pointer"
                                value={task.phase || 'EXÉCUTION & SUIVI'}
                                onChange={(e) => updateTask(activeDossier.id, axe.id, proj.id, task.id, 'phase', e.target.value)}
                              >
                                {STANDARD_PHASES.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                              <input
                                className="flex-1 min-w-[180px] bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:border-indigo-400"
                                placeholder="Action ou décision..."
                                value={task.name}
                                onChange={(e) => updateTask(activeDossier.id, axe.id, proj.id, task.id, 'name', e.target.value)}
                              />
                              <select 
                                className={`w-24 border rounded px-1 py-1 text-[10px] font-bold outline-none focus:border-indigo-400 cursor-pointer ${
                                  task.status === 'Terminé' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  task.status === 'En cours' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                  task.status === 'Bloqué' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                  'bg-slate-50 text-slate-600 border-slate-300'
                                }`}
                                value={task.status || 'À faire'}
                                onChange={(e) => updateTask(activeDossier.id, axe.id, proj.id, task.id, 'status', e.target.value)}
                              >
                                <option value="À faire">À faire</option>
                                <option value="En cours">En cours</option>
                                <option value="Terminé">Terminé</option>
                                <option value="Bloqué">Bloqué</option>
                              </select>
                            </div>
                            
                            <div className="flex gap-1 w-full xl:w-auto">
                              <div className="relative group/tooltip flex-1 xl:flex-none">
                                <input list="stakeholders-list" title="Clic pour modifier (R)" className="w-full xl:w-24 bg-slate-50 hover:bg-emerald-50 border-b-2 border-emerald-400 rounded-t px-1.5 py-1 text-[10px] font-bold text-slate-700 outline-none focus:bg-emerald-100 text-center cursor-text transition-colors" placeholder="R (Fait)" value={task.raci?.R || ''} onChange={(e) => updateTask(activeDossier.id, axe.id, proj.id, task.id, 'raci.R', e.target.value)} onFocus={(e) => (e.currentTarget as HTMLInputElement).select()} onClick={(e) => (e.currentTarget as HTMLInputElement).select()} />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/tooltip:block bg-slate-800 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap z-50">Réalisateur (Fait)</div>
                              </div>
                              <div className="relative group/tooltip flex-1 xl:flex-none">
                                <input list="stakeholders-list" title="Clic pour modifier (A)" className="w-full xl:w-24 bg-slate-50 hover:bg-rose-50 border-b-2 border-rose-400 rounded-t px-1.5 py-1 text-[10px] font-bold text-slate-700 outline-none focus:bg-rose-100 text-center cursor-text transition-colors" placeholder="A (Valide)" value={task.raci?.A || ''} onChange={(e) => updateTask(activeDossier.id, axe.id, proj.id, task.id, 'raci.A', e.target.value)} onFocus={(e) => (e.currentTarget as HTMLInputElement).select()} onClick={(e) => (e.currentTarget as HTMLInputElement).select()} />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/tooltip:block bg-slate-800 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap z-50">Approbateur (Valide)</div>
                              </div>
                              <div className="relative group/tooltip flex-1 xl:flex-none">
                                <input list="stakeholders-list" title="Clic pour modifier (C)" className="w-full xl:w-24 bg-slate-50 hover:bg-amber-50 border-b-2 border-amber-400 rounded-t px-1.5 py-1 text-[10px] font-bold text-slate-700 outline-none focus:bg-amber-100 text-center cursor-text transition-colors" placeholder="C (Avis)" value={task.raci?.C || ''} onChange={(e) => updateTask(activeDossier.id, axe.id, proj.id, task.id, 'raci.C', e.target.value)} onFocus={(e) => (e.currentTarget as HTMLInputElement).select()} onClick={(e) => (e.currentTarget as HTMLInputElement).select()} />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/tooltip:block bg-slate-800 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap z-50">Consulté (Avis)</div>
                              </div>
                              <div className="relative group/tooltip flex-1 xl:flex-none">
                                <input list="stakeholders-list" title="Clic pour modifier (I)" className="w-full xl:w-24 bg-slate-50 hover:bg-indigo-50 border-b-2 border-indigo-400 rounded-t px-1.5 py-1 text-[10px] font-bold text-slate-700 outline-none focus:bg-indigo-100 text-center cursor-text transition-colors" placeholder="I (Info)" value={task.raci?.I || ''} onChange={(e) => updateTask(activeDossier.id, axe.id, proj.id, task.id, 'raci.I', e.target.value)} onFocus={(e) => (e.currentTarget as HTMLInputElement).select()} onClick={(e) => (e.currentTarget as HTMLInputElement).select()} />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/tooltip:block bg-slate-800 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap z-50">Informé</div>
                              </div>
                              <button onClick={() => confirmDelete(() => deleteTask(activeDossier.id, axe.id, proj.id, task.id), "Voulez-vous vraiment supprimer cette action du projet ?")} className="text-slate-300 hover:text-rose-500 p-1.5 opacity-0 group-hover/task:opacity-100 transition-opacity shrink-0" title="Supprimer l'action">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                ))}
              </div>

            </div>
          );})}
        </div>
      </div>
    );
  };

  /* RENDU SYNTHÉTIQUE ET EXPORTABLE DE LA MATRICE RACI */
  const renderDecisionMatrix = () => {
    if (!activeDossier) return <div className="p-10 text-center text-slate-500">Veuillez ouvrir un programme depuis l'onglet Dossiers.</div>;

    interface MatrixRow {
      id: string;
      phase: string;
      action: string;
      r: string;
      a: string;
      c: string;
      i: string;
      proj?: string;
    }

    let matrixData: MatrixRow[] = [];
    if (decisionMatrixProjId !== 'FULL') {
      const selectedProject = activeProjects.find(p => p.id === decisionMatrixProjId);
      if (selectedProject && selectedProject.tasks) {
        matrixData = selectedProject.tasks.map((t, idx) => ({
           id: t.id || `task-${idx}`, phase: t.phase, action: t.name,
           r: t.raci?.R || '-', a: t.raci?.A || '-', c: t.raci?.C || '-', i: t.raci?.I || '-'
        }));
      }
    } else {
       const tasksToRender = decisionMatrixAxeId !== 'FULL' 
          ? activeDossierTasks.filter(t => t.axeId === decisionMatrixAxeId)
          : activeDossierTasks;

       matrixData = tasksToRender.map((t, idx) => ({
          id: t.id || `task-glob-${idx}`, phase: t.phase, action: t.name,
          r: t.raci?.R || '-', a: t.raci?.A || '-', c: t.raci?.C || '-', i: t.raci?.I || '-', proj: t.projectName
       }));
       matrixData.sort((a, b) => STANDARD_PHASES.indexOf(a.phase) - STANDARD_PHASES.indexOf(b.phase));
    }

    return (
      <div className="space-y-6 animate-in fade-in pb-10">
        <div className="flex justify-between items-center border-b pb-3 border-indigo-100 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              <ListTodo className="w-6 h-6 mr-2 text-indigo-600" /> Matrice des Décisions & Responsabilités (RACI)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Tableau de bord formalisant qui Réalise (R), Approuve (A), est Consulté (C) ou Informé (I).
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 shrink-0">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center">
              <Filter className="w-3 h-3 mr-1" /> 1. Sélectionner l'Axe Stratégique
            </label>
            <div className="relative">
              <select className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-800 text-sm font-medium rounded-lg focus:ring-2 focus:ring-indigo-500 p-2.5 pr-8 outline-none cursor-pointer" value={decisionMatrixAxeId} onChange={(e) => { setDecisionMatrixAxeId(e.target.value); setDecisionMatrixProjId('FULL'); }}>
                <option value="FULL">-- Programme Complet ({activeDossier?.name}) --</option>
                {activeDossier?.axes?.map(axe => <option key={`dec-axe-${axe.id}`} value={axe.id}>{axe.name}</option>)}
              </select>
              <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-3 rotate-90 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center">
              <Filter className="w-3 h-3 mr-1" /> 2. Sélectionner le Projet
            </label>
            <div className="relative">
              <select className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-800 text-sm font-medium rounded-lg focus:ring-2 focus:ring-indigo-500 p-2.5 pr-8 outline-none disabled:opacity-50 cursor-pointer" value={decisionMatrixProjId} onChange={(e) => setDecisionMatrixProjId(e.target.value)} disabled={decisionMatrixAxeId === 'FULL'}>
                <option value="FULL">-- Tous les projets --</option>
                {activeProjects.filter(p => p.axeId === decisionMatrixAxeId).map(proj => <option key={`dec-proj-${proj.id}`} value={proj.id}>{proj.name}</option>)}
              </select>
              <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-3 rotate-90 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-slate-600 mb-6 text-sm">Génération automatique des rôles définis dans les actions du PSD.</p>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-4 py-3.5 font-bold border-r border-slate-700">Phase / Décision</th>
                  <th className="px-4 py-3.5 font-bold text-center border-r border-slate-700 bg-emerald-950/40 text-emerald-300">Réalisateur (R)</th>
                  <th className="px-4 py-3.5 font-bold text-center border-r border-slate-700 bg-rose-950/40 text-rose-300">Approbateur (A)</th>
                  <th className="px-4 py-3.5 font-bold text-center border-r border-slate-700 bg-amber-950/40 text-amber-300">Consulté (C)</th>
                  <th className="px-4 py-3.5 font-bold text-center bg-indigo-950/40 text-indigo-300">Informé (I)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {matrixData.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500 italic bg-slate-50/50">Aucune donnée. Allez dans le PSD pour créer des actions.</td></tr> : 
                  matrixData.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-4 py-3.5 border-r border-slate-200"><div className="font-bold text-slate-800">{row.phase}</div><div className="text-[11px] text-slate-500 whitespace-normal mt-1 leading-relaxed max-w-sm">{row.action}</div>{decisionMatrixProjId === 'FULL' && <div className="text-[10px] text-indigo-600 mt-1.5 font-semibold italic">{row.proj}</div>}</td>
                      <td className="px-4 py-3.5 text-center border-r border-slate-200 bg-emerald-50/20">{row.r !== '-' && row.r !== '' && <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded border border-emerald-200 uppercase tracking-wide">{row.r}</span>}</td>
                      <td className="px-4 py-3.5 text-center border-r border-slate-200 bg-rose-50/20">{row.a !== '-' && row.a !== '' && <span className="inline-block px-2.5 py-1 bg-rose-100 text-rose-800 font-bold text-[10px] rounded border border-rose-200 uppercase tracking-wide">{row.a}</span>}</td>
                      <td className="px-4 py-3.5 text-center border-r border-slate-200 bg-amber-50/20">{row.c !== '-' && row.c !== '' && <span className="inline-block px-2.5 py-1 bg-amber-100 text-amber-800 font-bold text-[10px] rounded border border-amber-200 uppercase tracking-wide">{row.c}</span>}</td>
                      <td className="px-4 py-3.5 text-center bg-indigo-50/20">{row.i !== '-' && row.i !== '' && <span className="inline-block px-2.5 py-1 bg-indigo-100 text-indigo-800 font-bold text-[10px] rounded border border-indigo-200 uppercase tracking-wide">{row.i}</span>}</td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  /* CLASSIFICATION DIRECTE SUR LA MATRICE DE MENDELOW AVEC LES RÔLES STRICTS */
  const renderPowerMatrix = () => {
    if (!activeDossier) return <div className="p-10 text-center text-slate-500">Veuillez ouvrir un programme depuis l'onglet Dossiers.</div>;

    let currentStakeholders = activeDossier.stakeholders || [];

    if (powerMatrixProjId !== 'FULL') {
        currentStakeholders = currentStakeholders.filter(s => s.projectId === powerMatrixProjId);
    } else if (powerMatrixAxeId !== 'FULL') {
        const axe = activeDossier.axes.find(a => a.id === powerMatrixAxeId);
        const projIds = (axe?.projects || []).map(p => p.id);
        currentStakeholders = currentStakeholders.filter(s => projIds.includes(s.projectId));
    }
    
    const manageClosely = currentStakeholders.filter(s => s.pouvoir === 'Fort' && s.influence === 'Fort');
    const keepSatisfied = currentStakeholders.filter(s => s.pouvoir === 'Fort' && s.influence === 'Faible');
    const keepInformed = currentStakeholders.filter(s => s.pouvoir === 'Faible' && s.influence === 'Fort');
    const monitor = currentStakeholders.filter(s => s.pouvoir === 'Faible' && s.influence === 'Faible');

    return (
      <div className="space-y-6 animate-in fade-in pb-10">
        <div className="flex justify-between items-center border-b pb-3 border-indigo-100 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              <Grid className="w-6 h-6 mr-2 text-indigo-600" /> Matrice Pouvoir / Intérêt (Matrice de Mendelow)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Positionnement stratégique des acteurs selon leur niveau d'autorité et leur degré d'intérêt.
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 shrink-0">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center">
              <Filter className="w-3 h-3 mr-1" /> 1. Sélectionner l'Axe Stratégique
            </label>
            <div className="relative">
              <select className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-800 text-sm font-medium rounded-lg focus:ring-2 focus:ring-indigo-500 p-2.5 pr-8 outline-none cursor-pointer" value={powerMatrixAxeId} onChange={(e) => { setPowerMatrixAxeId(e.target.value); setPowerMatrixProjId('FULL'); }}>
                <option value="FULL">-- Programme Complet ({activeDossier?.name}) --</option>
                {activeDossier?.axes?.map(axe => <option key={`pwr-axe-${axe.id}`} value={axe.id}>{axe.name}</option>)}
              </select>
              <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-3 rotate-90 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center">
              <Filter className="w-3 h-3 mr-1" /> 2. Sélectionner le Projet
            </label>
            <div className="relative">
              <select className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-800 text-sm font-medium rounded-lg focus:ring-2 focus:ring-indigo-500 p-2.5 pr-8 outline-none disabled:opacity-50 cursor-pointer" value={powerMatrixProjId} onChange={(e) => setPowerMatrixProjId(e.target.value)} disabled={powerMatrixAxeId === 'FULL'}>
                <option value="FULL">-- Tous les projets --</option>
                {activeProjects.filter(p => p.axeId === powerMatrixAxeId).map(proj => <option key={`pwr-proj-${proj.id}`} value={proj.id}>{proj.name}</option>)}
              </select>
              <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-3 rotate-90 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-slate-600 mb-6 text-sm">
            Vue contextuelle : Seuls les acteurs identifiés dans le <strong>Registre des Acteurs</strong> pour les projets sélectionnés sont affichés.
          </p>
          
          <div className="relative">
            <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-bold text-slate-400 uppercase tracking-widest">Pouvoir</div>
            <div className="absolute bottom-[-30px] left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400 uppercase tracking-widest">Influence / Intérêt</div>

            <div className="grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-4 min-h-[580px] ml-4 mb-8 relative">
              
              {currentStakeholders.length === 0 && (
                <div className="absolute inset-0 bg-white/95 z-10 flex flex-col items-center justify-center backdrop-blur-[1px] rounded-xl border border-dashed border-slate-300">
                  <Activity className="w-10 h-10 text-indigo-400 mb-3" />
                  <p className="text-sm font-bold text-slate-500 text-center px-4 leading-relaxed">
                    Aucun acteur identifié pour ce filtre.<br/>
                    <span className="text-xs font-normal text-slate-400">Ajoutez-les d'abord via l'onglet Registre des Parties Prenantes.</span>
                  </p>
                </div>
              )}

              {/* HAUT-GAUCHE : Pouvoir Fort / Influence Faible -> Maintenir Satisfaits */}
              <div className="bg-sky-50/60 border-2 border-sky-100 rounded-xl p-4 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-sky-100 pb-2 mb-3">
                  <h3 className="font-bold text-sky-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-sky-600" /> Maintenir Satisfaits (Pouvoir + / Intérêt -)
                  </h3>
                  <span className="bg-sky-200 text-sky-800 text-[10px] font-black px-2 py-0.5 rounded-full">{keepSatisfied.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {keepSatisfied.length === 0 && <div className="text-xs text-sky-400 italic py-4 text-center">Aucun acteur dans ce quadrant</div>}
                  {keepSatisfied.map(s => (
                    <div key={`pwr-sat-${s.id}`} className="bg-white p-2.5 rounded-lg shadow-sm border border-sky-100 text-xs transition-shadow hover:shadow">
                      <div className="font-bold text-slate-800">{s.name || 'Anonyme'}</div>
                      <div className="text-slate-500 text-[10px] mt-0.5">{s.title || s.category}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* HAUT-DROITE : Pouvoir Fort / Influence Forte -> Acteurs Clés */}
              <div className="bg-rose-50/60 border-2 border-rose-100 rounded-xl p-4 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-rose-100 pb-2 mb-3">
                  <h3 className="font-bold text-rose-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-rose-600" /> Acteurs Clés : Gérer de près (Pouvoir + / Intérêt +)
                  </h3>
                  <span className="bg-rose-200 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full">{manageClosely.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {manageClosely.length === 0 && <div className="text-xs text-rose-400 italic py-4 text-center">Aucun acteur dans ce quadrant</div>}
                  {manageClosely.map(s => (
                    <div key={`pwr-close-${s.id}`} className="bg-white p-2.5 rounded-lg shadow-sm border border-rose-100 text-xs border-l-4 border-l-rose-500 transition-shadow hover:shadow">
                      <div className="font-bold text-slate-800">{s.name || 'Anonyme'}</div>
                      <div className="text-slate-500 text-[10px] mt-0.5">{s.title || s.category}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* BAS-GAUCHE : Pouvoir Faible / Influence Faible -> Surveiller */}
              <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                  <h3 className="font-bold text-slate-700 uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" /> Surveiller : Effort Minimal (Pouvoir - / Intérêt -)
                  </h3>
                  <span className="bg-slate-200 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full">{monitor.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {monitor.length === 0 && <div className="text-xs text-slate-400 italic py-4 text-center">Aucun acteur dans ce quadrant</div>}
                  {monitor.map(s => (
                    <div key={`pwr-mon-${s.id}`} className="bg-white p-2.5 rounded-lg shadow-sm border border-slate-200 text-xs transition-shadow hover:shadow">
                      <div className="font-bold text-slate-800">{s.name || 'Anonyme'}</div>
                      <div className="text-slate-500 text-[10px] mt-0.5">{s.title || s.category}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* BAS-DROITE : Pouvoir Faible / Influence Forte -> Garder Informés */}
              <div className="bg-emerald-50/60 border-2 border-emerald-100 rounded-xl p-4 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2 mb-3">
                  <h3 className="font-bold text-emerald-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> Garder Informés (Pouvoir - / Intérêt +)
                  </h3>
                  <span className="bg-emerald-200 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">{keepInformed.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {keepInformed.length === 0 && <div className="text-xs text-emerald-400 italic py-4 text-center">Aucun acteur dans ce quadrant</div>}
                  {keepInformed.map(s => (
                    <div key={`pwr-keepinf-${s.id}`} className="bg-white p-2.5 rounded-lg shadow-sm border border-emerald-100 text-xs transition-shadow hover:shadow">
                      <div className="font-bold text-slate-800">{s.name || 'Anonyme'}</div>
                      <div className="text-slate-500 text-[10px] mt-0.5">{s.title || s.category}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  };

  /* FICHE ANALYTIQUE COMPLÈTE DU CONTRAT D'ENGAGEMENT */
  const renderStakeholders = () => {
    if (!activeDossier) return <div className="p-10 text-center text-slate-500">Veuillez ouvrir un programme depuis l'onglet Dossiers.</div>;

    let currentStakeholders = activeDossier.stakeholders || [];

    if (stakeholderProjId !== 'FULL') {
        currentStakeholders = currentStakeholders.filter(s => s.projectId === stakeholderProjId);
    } else if (stakeholderAxeId !== 'FULL') {
        const axe = activeDossier.axes.find(a => a.id === stakeholderAxeId);
        const projIds = (axe?.projects || []).map(p => p.id);
        currentStakeholders = currentStakeholders.filter(s => projIds.includes(s.projectId));
    }

    const beneficiaries = currentStakeholders.filter(s => s.category === 'BÉNÉFICIAIRES');
    const internals = currentStakeholders.filter(s => s.category === 'INTERNE');
    const externals = currentStakeholders.filter(s => s.category === 'EXTERNE');
    const techOps = currentStakeholders.filter(s => s.category === 'OPÉRATEURS TECHNIQUES');
    const financials = currentStakeholders.filter(s => s.category === 'PARTENAIRES FINANCIERS');

    return (
      <div className="space-y-4 animate-in fade-in duration-500 pb-10 flex flex-col h-full">
        <div className="flex justify-between items-center border-b pb-3 border-indigo-100 shrink-0 mb-2">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              <Users className="w-5 h-5 mr-2 text-indigo-600" /> Cartographie Analytique des Parties Prenantes
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Tableau détaillé d'évaluation stratégique : mission, sources de pouvoir, nature de l'influence et plan de communication.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-2 shrink-0">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center">
              <Filter className="w-3 h-3 mr-1" /> 1. Sélectionner l'Axe Stratégique
            </label>
            <div className="relative">
              <select className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-800 text-sm font-medium rounded-lg focus:ring-2 focus:ring-indigo-500 p-2.5 pr-8 outline-none cursor-pointer" value={stakeholderAxeId} onChange={(e) => { setStakeholderAxeId(e.target.value); setStakeholderProjId('FULL'); }}>
                <option value="FULL">-- Vue globale de tous les axes --</option>
                {activeDossier?.axes?.map(axe => <option key={`sh-axe-${axe.id}`} value={axe.id}>{axe.name}</option>)}
              </select>
              <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-3 rotate-90 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center">
              <Filter className="w-3 h-3 mr-1" /> 2. Sélectionner le Projet
            </label>
            <div className="relative">
              <select className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-800 text-sm font-medium rounded-lg focus:ring-2 focus:ring-indigo-500 p-2.5 pr-8 outline-none disabled:opacity-50 cursor-pointer" value={stakeholderProjId} onChange={(e) => setStakeholderProjId(e.target.value)} disabled={stakeholderAxeId === 'FULL'}>
                <option value="FULL">-- Tous les projets --</option>
                {activeProjects.filter(p => p.axeId === stakeholderAxeId).map(proj => <option key={`sh-proj-${proj.id}`} value={proj.id}>{proj.name}</option>)}
              </select>
              <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-3 rotate-90 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex space-x-2 overflow-x-auto pb-1.5 mb-2 items-center shrink-0 hide-scrollbar">
          {[
            { id: 'ALL', label: 'Vue Globale' },
            { id: 'BENEFICIAIRES', label: `Bénéficiaires Directs (${beneficiaries.length})` },
            { id: 'INTERNAL', label: `Équipe Interne (${internals.length})` },
            { id: 'EXTERNAL', label: `Acteurs Externes (${externals.length})` },
            { id: 'TECHOPS', label: `Opérateurs Techniques (${techOps.length})` },
            { id: 'FINANCIAL', label: `Bailleurs & Sponsors (${financials.length})` }
          ].map((tab) => (
            <button 
              key={`sh-tab-${tab.id}`}
              onClick={() => setActiveStakeholderTab(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-xs transition-all font-medium whitespace-nowrap cursor-pointer ${activeStakeholderTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {currentStakeholders.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center text-slate-500">
             <Users className="w-12 h-12 text-slate-300 mb-3" />
             <p className="font-bold text-sm">Aucun acteur impliqué.</p>
             <p className="text-xs mt-1">Ajoutez des acteurs via le Registre des Parties Prenantes.</p>
             <button onClick={() => setActiveTab('registre_stakeholders')} className="mt-4 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs">
               Ouvrir le Registre des Acteurs
             </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-2 pb-10 space-y-8">
          {[
            { id: 'BENEFICIAIRES', title: 'Bénéficiaires Directs (Zone Critique)', list: beneficiaries, icon: UserCheck, color: 'text-emerald-500' },
            { id: 'INTERNAL', title: 'Équipe Interne', list: internals, icon: Layout, color: 'text-indigo-500' },
            { id: 'EXTERNAL', title: 'Acteurs Externes & Institutionnels', list: externals, icon: Shield, color: 'text-rose-500' },
            { id: 'TECHOPS', title: 'Opérateurs Techniques & Experts', list: techOps, icon: Database, color: 'text-amber-500' },
            { id: 'FINANCIAL', title: 'Partenaires Financiers & Sponsors', list: financials, icon: DollarSign, color: 'text-teal-500' }
          ].map(section => {
            if (activeStakeholderTab !== 'ALL' && activeStakeholderTab !== section.id) return null;
            if (section.list.length === 0) return null;

            const IconComp = section.icon;

            return (
              <div key={section.id}>
                <h3 className="text-md font-bold text-slate-700 mb-3 flex items-center border-b pb-2">
                  <IconComp className={`w-4 h-4 mr-2 ${section.color}`} /> {section.title}
                </h3>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-800 text-xs border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3.5 font-bold w-48">Acteur & Fonction</th>
                          <th className="px-4 py-3.5 font-bold w-48">Mission Principale</th>
                          <th className="px-4 py-3.5 font-bold text-center">Pouvoir</th>
                          <th className="px-4 py-3.5 font-bold text-slate-600">Source du Pouvoir</th>
                          <th className="px-4 py-3.5 font-bold text-center">Influence</th>
                          <th className="px-4 py-3.5 font-bold text-slate-600">Nature de l'Influence</th>
                          <th className="px-4 py-3.5 font-bold bg-slate-50/50">Plan d'Action Stratégique (Par Phase)</th>
                          <th className="px-3 py-3.5 font-bold text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {section.list.map((s, idx) => (
                          <tr key={`sh-act-${s.id || idx}`} className="hover:bg-slate-50/40 transition-colors">
                            <td className="px-4 py-3 align-top">
                              <div className="font-bold text-slate-800 text-sm mb-0.5">{s.name || 'Anonyme'}</div>
                              <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-wide mb-1.5">{s.title || '-'}</div>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600 whitespace-normal min-w-[200px] leading-snug align-top">{s.mission || 'Non défini'}</td>
                            <td className="px-4 py-3 text-center align-top pt-4">{renderBadge(s.pouvoir)}</td>
                            <td className="px-4 py-3 text-xs text-slate-700 whitespace-normal min-w-[200px] leading-snug align-top bg-slate-50/30">{s.explicationPouvoir || '-'}</td>
                            <td className="px-4 py-3 text-center align-top pt-4">{renderBadge(s.influence)}</td>
                            <td className="px-4 py-3 text-xs text-slate-700 whitespace-normal min-w-[200px] leading-snug align-top bg-slate-50/30">{s.explicationInfluence || '-'}</td>
                            <td className="px-4 py-3 text-xs font-medium text-indigo-800 whitespace-normal min-w-[220px] leading-snug align-top bg-indigo-50/20 border-l border-r border-indigo-50">{s.planCommunication || '-'}</td>
                            <td className="px-3 py-3 text-center align-top pt-3">
                              <button 
                                onClick={() => setModalActorId(s.id)} 
                                className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-slate-100 transition-colors"
                                title="Éditer la fiche de cet acteur"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* GENERATION DU WORKFLOW DU CYCLE DE VIE DES ACTIONS */
  const renderWorkflows = () => {
    if (!activeDossier) return <div className="p-10 text-center text-slate-500">Veuillez ouvrir un programme depuis l'onglet Dossiers.</div>;

    interface WorkflowTask extends Task {
      projectName?: string;
      axeId?: string;
    }

    let tasksFlow: WorkflowTask[] = [];
    if (workflowProjId !== 'FULL') {
      const proj = activeProjects.find(p => p.id === workflowProjId);
      tasksFlow = (proj?.tasks || []).map(t => ({ ...t, projectName: proj?.name }));
    } else if (workflowAxeId !== 'FULL') {
      tasksFlow = activeDossierTasks.filter(t => t.axeId === workflowAxeId);
    } else {
      tasksFlow = activeDossierTasks;
    }

    return (
      <div className="space-y-6 animate-in fade-in pb-10">
        <div className="flex justify-between items-center border-b pb-3 border-indigo-100 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              <FolderTree className="w-6 h-6 mr-2 text-indigo-600" />
              Workflows & Processus Opérationnels
            </h2>
            <p className="text-xs text-slate-500 mt-1">Cycle de vie des actions articulé selon les 5 phases normalisées de gestion de projet.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 shrink-0">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center">
              <Filter className="w-3 h-3 mr-1" /> 1. Sélectionner l'Axe Stratégique
            </label>
            <div className="relative">
              <select
                className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-800 text-sm font-medium rounded-lg focus:ring-2 focus:ring-indigo-500 p-2.5 pr-8 outline-none cursor-pointer"
                value={workflowAxeId}
                onChange={(e) => { setWorkflowAxeId(e.target.value); setWorkflowProjId('FULL'); }}
              >
                <option value="FULL">-- Vue Globale de tous les axes --</option>
                {activeDossier?.axes?.map(axe => (
                  <option key={`workflow-axe-opt-${axe.id}`} value={axe.id}>{axe.name}</option>
                ))}
              </select>
              <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-3 rotate-90 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center">
              <Filter className="w-3 h-3 mr-1" /> 2. Sélectionner le Projet
            </label>
            <div className="relative">
              <select
                className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-800 text-sm font-medium rounded-lg focus:ring-2 focus:ring-indigo-500 p-2.5 pr-8 outline-none disabled:opacity-50 cursor-pointer"
                value={workflowProjId}
                onChange={(e) => setWorkflowProjId(e.target.value)}
                disabled={workflowAxeId === 'FULL'}
              >
                <option value="FULL">-- Tous les projets --</option>
                {activeProjects.filter(p => p.axeId === workflowAxeId).map(proj => (
                  <option key={`workflow-proj-opt-${proj.id}`} value={proj.id}>{proj.name}</option>
                ))}
              </select>
              <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-3 rotate-90 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-slate-600 mb-6 text-sm">
            {workflowProjId === 'FULL' 
              ? (workflowAxeId === 'FULL' ? "Cartographie dynamique de toutes les actions enregistrées dans l'ensemble du programme." : "Cartographie dynamique des actions de l'axe sélectionné.")
              : "Visualisation sous forme de workflow des actions spécifiques définies pour le projet sélectionné."
            }
          </p>

          <div className="space-y-4">
            <div className="space-y-6">
              {STANDARD_PHASES.map((phaseName, phaseIdx) => {
                const tasksForPhase = tasksFlow.filter(t => t.phase === phaseName);
                return (
                  <div key={`workflow-phase-${phaseIdx}`} className="mb-6">
                    <h4 className="font-bold text-slate-700 mb-4 bg-slate-100 p-2.5 rounded-lg border-l-4 border-indigo-500 flex items-center uppercase tracking-wide text-xs shadow-sm">
                      {phaseIdx + 1}. {phaseName} ({tasksForPhase.length})
                    </h4>
                    <div className="space-y-4 pl-2 border-l-2 border-slate-100 ml-4 relative">
                      {tasksForPhase.length === 0 ? (
                        <div className="text-xs text-slate-400 italic bg-white p-3 rounded-lg border border-dashed border-slate-200 ml-6">
                          Aucune action enregistrée pour cette phase dans l'éditeur PSD.
                        </div>
                      ) : (
                        tasksForPhase.map((task) => (
                          <div key={`workflow-task-${task.id}`} className="flex items-start group relative">
                            <div className="absolute -left-[25px] w-8 h-8 rounded-full bg-white border-2 border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs shadow-sm mt-1 z-10">
                              <CheckCircle className="w-4 h-4" />
                            </div>
                            <div className="w-full bg-slate-50/50 hover:bg-indigo-50/20 p-4 rounded-xl border border-slate-100 shadow-sm transition-colors ml-6">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-2">
                                <div>
                                  <h4 className="font-bold text-slate-800 text-sm">{task.name || 'Action sans titre'}</h4>
                                  {(workflowProjId === 'FULL' || workflowAxeId === 'FULL') && (
                                    <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider flex items-center">
                                      <FolderTree className="w-3 h-3 mr-1 text-indigo-500" /> {task.projectName}
                                    </div>
                                  )}
                                </div>
                                <span className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider border shrink-0 ${
                                  task.status === 'Terminé' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                  task.status === 'En cours' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                                  task.status === 'Bloqué' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                                  'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                  {task.status}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 text-[10px] font-bold mt-3">
                                 {task.raci?.R && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 shadow-sm text-[9px]">Fait (R) : {task.raci.R}</span>}
                                 {task.raci?.A && <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200 shadow-sm text-[9px]">Valide (A) : {task.raci.A}</span>}
                                 {task.raci?.C && <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 shadow-sm text-[9px]">Avis (C) : {task.raci.C}</span>}
                                 {task.raci?.I && <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 shadow-sm text-[9px]">Info (I) : {task.raci.I}</span>}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      <datalist id="stakeholders-list">
        {(activeDossier?.stakeholders || []).map(s => <option key={s.id} value={s.name} />)}
        <option value="Autre (Préciser...)" />
      </datalist>

      {/* HEADER AVEC TITRE DYNAMIQUE DE L'ORGANISME */}
      <header className="bg-white border-b border-slate-200 shadow-sm px-6 py-3 flex justify-between items-center shrink-0 z-50 relative">
        <div className="flex items-center space-x-3">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2 mr-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors outline-none cursor-pointer" title="Basculer le menu">
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-inner">
             {isProgramOpened && activeDossier?.institution ? activeDossier.institution.substring(0,2).toUpperCase() : 'GS'}
          </div>
          <div>
              <h1 className="text-base font-extrabold text-slate-800 leading-tight">
                  {isProgramOpened && activeDossier?.institution ? activeDossier.institution : "Portail de Gouvernance Stratégique"}
              </h1>
              <p className="text-[10px] text-indigo-600 font-bold tracking-wider uppercase mt-0.5">
                  {isProgramOpened && activeDossier?.name ? activeDossier.name : "Cartographie Transverse des Parties Prenantes (Stakeholders)"}
              </p>
          </div>
        </div>

        {isProgramOpened && activeDossier && (
          <div className="flex items-center space-x-2">
            <span className="hidden sm:inline-flex items-center text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              Dossier Actif
            </span>
            <button 
              onClick={() => { setActiveTab('dossiers'); setIsProgramOpened(false); }}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer"
            >
              Tous les dossiers
            </button>
          </div>
        )}
      </header>

      {/* COMPOSANT GENERAL BARRE LATERALE */}
      <div className="flex flex-1 overflow-hidden relative">
        <aside className={`bg-white border-slate-200 shrink-0 flex flex-col transition-all duration-300 ease-in-out overflow-hidden z-40 relative shadow-[4px_0_15px_-3px_rgba(0,0,0,0.05)] border-r ${isSidebarOpen ? 'w-64' : 'w-[72px]'}`}>
          <div className="w-full px-3 py-4 flex flex-col h-full overflow-y-auto hide-scrollbar overflow-x-hidden">
            <nav className="space-y-1.5 flex-1 text-sm font-medium">
              <button title="Dossiers" onClick={() => { setActiveTab('dossiers'); setIsProgramOpened(false); }} className={`w-full flex items-center ${isSidebarOpen ? 'px-3 space-x-3 justify-start' : 'px-0 justify-center'} py-2.5 rounded-lg transition-all cursor-pointer ${activeTab === 'dossiers' && !isProgramOpened ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Folder className="w-5 h-5 shrink-0" />{isSidebarOpen && <span className="truncate">Dossiers</span>}
              </button>
              
              {isProgramOpened && (
                <>
                  <div className="my-3 border-t border-slate-100"></div>
                  {isSidebarOpen && <div className="px-3 mb-2 text-[9px] font-black text-slate-400 uppercase tracking-wider">Plan d'Organisation</div>}
                  
                  <button title="Programme (PSD)" onClick={() => setActiveTab('psd')} className={`w-full flex items-center ${isSidebarOpen ? 'px-3 space-x-3 justify-start' : 'px-0 justify-center'} py-2.5 rounded-lg transition-all cursor-pointer ${activeTab === 'psd' ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <Map className="w-5 h-5 shrink-0" />{isSidebarOpen && <span className="truncate">Programme (PSD)</span>}
                  </button>

                  <button title="Registre des Acteurs" onClick={() => setActiveTab('registre_stakeholders')} className={`w-full flex items-center ${isSidebarOpen ? 'px-3 space-x-3 justify-start' : 'px-0 justify-center'} py-2.5 rounded-lg transition-all cursor-pointer ${activeTab === 'registre_stakeholders' ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <Database className="w-5 h-5 shrink-0" />{isSidebarOpen && <span className="truncate">Registre des Acteurs</span>}
                  </button>

                  <button title="Stakeholders (Analyse)" onClick={() => setActiveTab('stakeholders')} className={`w-full flex items-center ${isSidebarOpen ? 'px-3 space-x-3 justify-start' : 'px-0 justify-center'} py-2.5 rounded-lg transition-all cursor-pointer ${activeTab === 'stakeholders' ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <Users className="w-5 h-5 shrink-0" />{isSidebarOpen && <span className="truncate">Analyse des concernés</span>}
                  </button>
                  <button title="Matrice Pouvoir / Intérêt" onClick={() => setActiveTab('power_matrix')} className={`w-full flex items-center ${isSidebarOpen ? 'px-3 space-x-3 justify-start' : 'px-0 justify-center'} py-2.5 rounded-lg transition-all cursor-pointer ${activeTab === 'power_matrix' ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <Grid className="w-5 h-5 shrink-0" />{isSidebarOpen && <span className="truncate">Matrice Pouvoir / Intérêt</span>}
                  </button>
                  <button title="Matrice des Décisions" onClick={() => setActiveTab('decision_matrix')} className={`w-full flex items-center ${isSidebarOpen ? 'px-3 space-x-3 justify-start' : 'px-0 justify-center'} py-2.5 rounded-lg transition-all cursor-pointer ${activeTab === 'decision_matrix' ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <ListTodo className="w-5 h-5 shrink-0" />{isSidebarOpen && <span className="truncate">Matrice des Décisions</span>}
                  </button>
                  <button title="Workflows" onClick={() => setActiveTab('workflows')} className={`w-full flex items-center ${isSidebarOpen ? 'px-3 space-x-3 justify-start' : 'px-0 justify-center'} py-2.5 rounded-lg transition-all cursor-pointer ${activeTab === 'workflows' ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <FolderTree className="w-5 h-5 shrink-0" />{isSidebarOpen && <span className="truncate">Workflows d'exécution</span>}
                  </button>
                </>
              )}
            </nav>
            {isSidebarOpen ? (
              <div className="mt-auto pt-4 border-t border-slate-100 text-[10px] text-slate-500 flex flex-col items-center shrink-0">
                <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 w-full text-center shadow-sm">
                  <div className="flex justify-center mb-1.5"><Shield className="w-4 h-4 text-indigo-600" /></div>
                  <p className="font-bold text-slate-800 text-[11px] mb-0.5">Koffié Fabien Michael</p>
                  <p className="text-[8px] text-indigo-600 font-bold uppercase tracking-wider mb-2">Propriété Intellectuelle</p>
                  <div className="space-y-1.5 text-slate-600 mt-2">
                    <p className="flex justify-center items-center font-medium tracking-wide"> +225 07 48 08 27 39</p>
                    <p className="flex justify-center items-center break-all font-medium"> fabien.frikupgeneration@gmail.com</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-auto pt-4 border-t border-slate-100 text-[10px] text-slate-400 text-center font-bold flex flex-col items-center">
                <Shield className="w-4 h-4 text-indigo-400 mb-1" />
                <span className="text-slate-600">KFM</span>
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 p-6 overflow-y-auto bg-slate-50 z-10 relative">
          {activeTab === 'dossiers' && renderDossiers()}
          {activeTab === 'registre_stakeholders' && renderRegistrePartiesPrenantes()}
          {activeTab === 'psd' && renderPsdEditor()}
          {activeTab === 'workflows' && renderWorkflows()}
          {activeTab === 'power_matrix' && renderPowerMatrix()}
          {activeTab === 'decision_matrix' && renderDecisionMatrix()}
          {activeTab === 'stakeholders' && renderStakeholders()}
        </main>
      </div>

      {/* MODAL DÉTAILS DE L'ACTEUR AVEC VERROUILLAGE BÉNÉFICIAIRES */}
      {modalActorId && (() => {
        const actorToEdit = activeDossier?.stakeholders?.find(s => s.id === modalActorId);
        if (!actorToEdit) return null;

        const isBeneficiary = actorToEdit.category === 'BÉNÉFICIAIRES';
        const isFieldReadOnly = (fieldName: keyof Stakeholder) => {
          if (!isBeneficiary) return false;
          const val = actorToEdit[fieldName];
          return val !== undefined && val !== null && val !== '';
        };

        return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                    <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Détails de l'Acteur</h3>
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{actorToEdit.category}</p>
                        </div>
                        <button onClick={() => setModalActorId(null)} className="p-2 bg-white rounded-full text-slate-400 hover:text-rose-500 shadow-sm border border-slate-200 transition-colors cursor-pointer">
                            <X className="w-5 h-5"/>
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3 mb-2">
                            <div className="text-xs text-slate-500">
                              {isBeneficiary 
                                ? "Conformément aux directives, les champs pré-remplis pour les BÉNÉFICIAIRES ne sont pas modifiables."
                                : "Renseignez les champs ou utilisez la génération automatique méthodologique."}
                            </div>
                            {!isBeneficiary && (
                              <button 
                                type="button"
                                onClick={() => {
                                  const defaults = getSmartActorDefaults(actorToEdit.category, actorToEdit.name, actorToEdit.title);
                                  handleUpdateStakeholder(actorToEdit.id, 'pouvoir', defaults.pouvoir);
                                  handleUpdateStakeholder(actorToEdit.id, 'explicationPouvoir', defaults.explicationPouvoir);
                                  handleUpdateStakeholder(actorToEdit.id, 'influence', defaults.influence);
                                  handleUpdateStakeholder(actorToEdit.id, 'explicationInfluence', defaults.explicationInfluence);
                                  handleUpdateStakeholder(actorToEdit.id, 'planCommunication', defaults.planCommunication);
                                  handleUpdateStakeholder(actorToEdit.id, 'mission', defaults.mission);
                                }}
                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-200 shadow-sm flex items-center transition-colors shrink-0 cursor-pointer"
                              >
                                <Activity className="w-3.5 h-3.5 mr-1.5 text-indigo-600 animate-pulse" />
                                Remplissage intelligent (Mendelow/Mitchell)
                              </button>
                            )}
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nom de l'Acteur</label>
                            <input 
                              disabled={isFieldReadOnly('name')} 
                              className={`w-full border rounded-lg p-2.5 text-sm font-bold outline-none transition-all ${
                                isFieldReadOnly('name') 
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none' 
                                  : 'bg-slate-50 border-slate-300 text-slate-800 focus:ring-2 focus:ring-indigo-500'
                              }`} 
                              value={actorToEdit.name} 
                              onChange={(e) => handleUpdateStakeholder(actorToEdit.id, 'name', e.target.value)} 
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Rôle / Fonction Principale</label>
                                <input 
                                  disabled={isFieldReadOnly('title')} 
                                  className={`w-full border rounded-lg p-2.5 text-sm outline-none transition-all ${
                                    isFieldReadOnly('title') 
                                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none' 
                                      : 'bg-slate-50 border-slate-300 text-slate-800 focus:ring-2 focus:ring-indigo-500'
                                  }`}
                                  placeholder="Ex: Chef de Projet..." 
                                  value={actorToEdit.title} 
                                  onChange={(e) => handleUpdateStakeholder(actorToEdit.id, 'title', e.target.value)} 
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mission liée au plan</label>
                                <input 
                                  disabled={isFieldReadOnly('mission')} 
                                  className={`w-full border rounded-lg p-2.5 text-sm outline-none transition-all ${
                                    isFieldReadOnly('mission') 
                                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none' 
                                      : 'bg-slate-50 border-slate-300 text-slate-800 focus:ring-2 focus:ring-indigo-500'
                                  }`}
                                  placeholder="Ex: Valider le cadrage..." 
                                  value={actorToEdit.mission} 
                                  onChange={(e) => handleUpdateStakeholder(actorToEdit.id, 'mission', e.target.value)} 
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pouvoir (Arbitrage)</label>
                                <select 
                                  disabled={isFieldReadOnly('pouvoir')} 
                                  className={`w-full border rounded-lg p-2.5 text-sm font-bold outline-none transition-all cursor-pointer ${
                                    isFieldReadOnly('pouvoir') 
                                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                                      : 'bg-slate-50 border-slate-300 text-slate-800 focus:ring-2 focus:ring-indigo-500'
                                  }`}
                                  value={actorToEdit.pouvoir} 
                                  onChange={(e) => handleUpdateStakeholder(actorToEdit.id, 'pouvoir', e.target.value)}
                                >
                                    <option value="Faible">Faible</option>
                                    <option value="Fort">Fort</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Source du Pouvoir</label>
                                <input 
                                  disabled={isFieldReadOnly('explicationPouvoir')} 
                                  className={`w-full border rounded-lg p-2.5 text-sm outline-none transition-all ${
                                    isFieldReadOnly('explicationPouvoir') 
                                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none' 
                                      : 'bg-slate-50 border-slate-300 text-slate-800 focus:ring-2 focus:ring-indigo-500'
                                  }`}
                                  placeholder="Pourquoi ce pouvoir ?" 
                                  value={actorToEdit.explicationPouvoir} 
                                  onChange={(e) => handleUpdateStakeholder(actorToEdit.id, 'explicationPouvoir', e.target.value)} 
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Niveau d'Influence / Intérêt</label>
                                <select 
                                  disabled={isFieldReadOnly('influence')} 
                                  className={`w-full border rounded-lg p-2.5 text-sm font-bold outline-none transition-all cursor-pointer ${
                                    isFieldReadOnly('influence') 
                                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                                      : 'bg-slate-50 border-slate-300 text-slate-800 focus:ring-2 focus:ring-indigo-500'
                                  }`}
                                  value={actorToEdit.influence} 
                                  onChange={(e) => handleUpdateStakeholder(actorToEdit.id, 'influence', e.target.value)}
                                >
                                    <option value="Faible">Faible</option>
                                    <option value="Fort">Fort</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nature de l'Influence</label>
                                <input 
                                  disabled={isFieldReadOnly('explicationInfluence')} 
                                  className={`w-full border rounded-lg p-2.5 text-sm outline-none transition-all ${
                                    isFieldReadOnly('explicationInfluence') 
                                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none' 
                                      : 'bg-slate-50 border-slate-300 text-slate-800 focus:ring-2 focus:ring-indigo-500'
                                  }`}
                                  placeholder="D'où vient l'intérêt ?" 
                                  value={actorToEdit.explicationInfluence} 
                                  onChange={(e) => handleUpdateStakeholder(actorToEdit.id, 'explicationInfluence', e.target.value)} 
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Plan de Communication Requis</label>
                                <input 
                                  disabled={isFieldReadOnly('planCommunication')} 
                                  className={`w-full border rounded-lg p-2.5 text-sm outline-none transition-all ${
                                    isFieldReadOnly('planCommunication') 
                                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none' 
                                      : 'bg-slate-50 border-slate-300 text-slate-800 focus:ring-2 focus:ring-indigo-500'
                                  }`}
                                  placeholder="Ex: Réunions hebdos, Rapports mensuels..." 
                                  value={actorToEdit.planCommunication} 
                                  onChange={(e) => handleUpdateStakeholder(actorToEdit.id, 'planCommunication', e.target.value)} 
                                />
                            </div>
                        </div>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-b-2xl border-t border-slate-200 flex justify-end">
                        <button onClick={() => setModalActorId(null)} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer">
                            Sauvegarder & Fermer
                        </button>
                    </div>
                </div>
            </div>
        );
      })()}

      {/* CONFIRMATION DE SUPPRESSION */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 transition-opacity">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-rose-50 mb-5 mx-auto border border-rose-100">
              <AlertTriangle className="w-7 h-7 text-rose-500" />
            </div>
            <h3 className="text-lg font-bold text-center text-slate-800 mb-2">Confirmation requise</h3>
            <p className="text-sm text-center text-slate-600 mb-8 leading-snug">{deleteModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal({ isOpen: false, action: null, message: '' })} className="flex-1 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer">
                Annuler
              </button>
              <button onClick={() => { if (deleteModal.action) deleteModal.action(); setDeleteModal({ isOpen: false, action: null, message: '' }); }} className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors shadow-sm cursor-pointer">
                Oui, valider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
