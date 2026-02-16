'use client'
import type { DropResult } from '@hello-pangea/dnd'
import { yupResolver } from '@hookform/resolvers/yup'
import { createContext, startTransition, use, useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'

import avatar1 from '@/assets/images/users/avatar-1.jpg'

import { kanbanSectionsData, kanbanTasksData } from '@/assets/data/apps'
import type { ChildrenType } from '@/types/component-props'
import type { KanbanDialogType, KanbanType } from '@/types/context'
import type { KanbanSectionType, KanbanTaskType } from '@/types/data'

const ThemeContext = createContext<KanbanType | undefined>(undefined)

export const kanbanTaskSchema = yup.object({
  title: yup.string().required('Please enter project title'),
  description: yup.string().required('Please enter project description'),
  totalTasks: yup.number().required('Please enter number of tasks'),
})

export type TaskFormFields = yup.InferType<typeof kanbanTaskSchema>

export const kanbanSectionSchema = yup.object({
  sectionTitle: yup.string().required('Section title is required'),
})

export type SectionFormFields = yup.InferType<typeof kanbanSectionSchema>

const useKanbanContext = () => {
  const context = use(ThemeContext)
  if (!context) {
    throw new Error('useKanbanContext can only be used within KanbanProvider')
  }
  return context
}

const KanbanProvider = ({ children }: ChildrenType) => {
  const [sections, setSections] = useState<KanbanSectionType[]>(kanbanSectionsData)
  const [tasks, setTasks] = useState<KanbanTaskType[]>(kanbanTasksData)
  const [activeSectionId, setActiveSectionId] = useState<KanbanSectionType['id']>()
  const [activeTaskId, setActiveTaskId] = useState<KanbanTaskType['id']>()
  const [taskFormData, setTaskFormData] = useState<KanbanTaskType>()
  const [sectionFormData, setSectionFormData] = useState<KanbanSectionType>()
  const [dialogStates, setDialogStates] = useState<KanbanDialogType>({
    showNewTaskModal: false,
    showSectionModal: false,
  })

  const {
    control: newTaskControl,
    handleSubmit: newTaskHandleSubmit,
    reset: newTaskReset,
  } = useForm({
    resolver: yupResolver(kanbanTaskSchema),
  })

  const {
    control: sectionControl,
    handleSubmit: sectionHandleSubmit,
    reset: sectionReset,
  } = useForm({
    resolver: yupResolver(kanbanSectionSchema),
  })

  const emptySectionForm = useCallback(() => {
    sectionReset({ sectionTitle: '' })
  }, [])

  const emptyTaskForm = useCallback(() => {
    newTaskReset({
      title: undefined,
      description: undefined,
      // priority: undefined,
      // tags: undefined,
      totalTasks: undefined,
    })
  }, [])

  const toggleNewTaskModal = (sectionId?: KanbanSectionType['id'], taskId?: KanbanTaskType['id']) => {
    if (sectionId) setActiveSectionId(sectionId)
    if (taskId) {
      const foundTask = tasks.find((task) => task.id === taskId)
      if (foundTask) {
        newTaskReset({
          title: foundTask.title,
          description: foundTask.description,
          // priority: foundTask.priority,
          // totalTasks: foundTask.totalTasks,
          // tags: foundTask.tags ? foundTask.tags[0] : 'API',
        })
        startTransition(() => {
          setActiveTaskId(taskId)
        })
        startTransition(() => {
          setTaskFormData(foundTask)
        })
      }
    }
    if (dialogStates.showNewTaskModal) emptyTaskForm()
    startTransition(() => {
      setDialogStates({ ...dialogStates, showNewTaskModal: !dialogStates.showNewTaskModal })
    })
  }

  const toggleSectionModal = (sectionId?: KanbanSectionType['id']) => {
    if (sectionId) {
      const foundSection = sections.find((section) => section.id === sectionId)
      if (foundSection) {
        startTransition(() => {
          setSectionFormData(foundSection)
        })
        startTransition(() => {
          setActiveSectionId(foundSection.id)
        })
        sectionReset({
          sectionTitle: foundSection.title,
        })
      }
    }
    if (dialogStates.showSectionModal) emptySectionForm()
    startTransition(() => {
      setDialogStates({ ...dialogStates, showSectionModal: !dialogStates.showSectionModal })
    })
  }

  const getAllTasksPerSection = useCallback(
    (id: KanbanSectionType['id']) => {
      return tasks.filter((task) => task.sectionId == id)
    },
    [tasks],
  )

  const handleNewTask = newTaskHandleSubmit((values: TaskFormFields) => {
    const formData: TaskFormFields = {
      title: values.title,
      description: values.description,
      // priority: values.priority,
      // tags: values.tags,
      totalTasks: values.totalTasks,
    }

    if (activeSectionId) {
      const newTask: KanbanTaskType = {
        ...formData,
        // tags: [formData.tags],
        sectionId: activeSectionId,
        id: Number(tasks.slice(-1)[0].id) + 1 + '',
        views: 0,
        members: [avatar1],
        share: 10,
        variant: 'success',
        // completedTasks: 0,
        commentsCount: 0,
      }
      setTasks([...tasks, newTask])
    }
    startTransition(() => {
      toggleNewTaskModal()
    })
    setActiveSectionId(undefined)
    newTaskReset()
  })

  const handleEditTask = newTaskHandleSubmit((values: TaskFormFields) => {
    const formData: TaskFormFields = {
      title: values.title,
      description: values.description,
      // priority: values.priority,
      // tags: values.tags,
      totalTasks: values.totalTasks,
    }

    if (activeSectionId && activeTaskId) {
      const newTask: KanbanTaskType = {
        ...formData,
        views: 0,
        members: [avatar1],
        share: 10,
        variant: 'success',
        // tags: [formData.tags],
        sectionId: activeSectionId,
        id: activeTaskId,
        // completedTasks: 0,
        commentsCount: 0,
      }
      setTasks(tasks.map((t) => (t.id === activeTaskId ? newTask : t)))
    }
    startTransition(() => {
      toggleNewTaskModal()
    })
    startTransition(() => {
      setActiveSectionId(undefined)
    })
    startTransition(() => {
      newTaskReset()
    })
    startTransition(() => {
      setTaskFormData(undefined)
    })
  })

  const handleDeleteTask = (taskId: KanbanTaskType['id']) => {
    setTasks(tasks.filter((task) => task.id !== taskId))
  }

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result

    if (!destination) {
      return
    }
    let sourceOccurrence = source.index
    let destinationOccurrence = destination.index

    let sourceId = 0,
      destinationId = 0

    tasks.forEach((task, index) => {
      if (task.sectionId == source.droppableId) {
        if (sourceOccurrence == 0) {
          sourceId = index
        }
        sourceOccurrence--
      }
      if (task.sectionId == destination.droppableId) {
        if (destinationOccurrence == 0) {
          destinationId = index
        }
        destinationOccurrence--
      }
    })

    const task = tasks[sourceId]
    const newTasks = tasks.filter((t) => t.id != task.id)
    task.sectionId = destination.droppableId
    const parity = destination.droppableId != source.droppableId ? -1 : 0
    setTasks([...newTasks.slice(0, destinationId + parity), task, ...newTasks.slice(destinationId + parity)])
  }

  const handleNewSection = sectionHandleSubmit((values: SectionFormFields) => {
    const section: KanbanSectionType = {
      // TODO test, test when array is empty
      id: Number(sections.slice(-1)[0].id) + 1 + '',
      title: values.sectionTitle,
    }
    setSections([...sections, section])
    startTransition(() => {
      toggleSectionModal()
    })
    sectionReset()
  })

  const handleEditSection = sectionHandleSubmit((values: SectionFormFields) => {
    if (activeSectionId) {
      const newSection = {
        id: activeSectionId,
        title: values.sectionTitle,
      }
      setSections(
        sections.map((section) => {
          return section.id === activeSectionId ? newSection : section
        }),
      )
    }
    startTransition(() => {
      toggleSectionModal()
    })
    sectionReset()
  })

  const handleDeleteSection = (sectionId: KanbanSectionType['id']) => {
    setSections(sections.filter((section) => section.id !== sectionId))
  }

  return (
    <ThemeContext.Provider
      value={useMemo(
        () => ({
          sections,
          activeSectionId,
          taskFormData,
          sectionFormData,
          newTaskModal: {
            open: dialogStates.showNewTaskModal,
            toggle: toggleNewTaskModal,
          },
          sectionModal: {
            open: dialogStates.showSectionModal,
            toggle: toggleSectionModal,
          },
          taskForm: {
            control: newTaskControl,
            newRecord: handleNewTask,
            editRecord: handleEditTask,
            deleteRecord: handleDeleteTask,
          },
          sectionForm: {
            control: sectionControl,
            newRecord: handleNewSection,
            editRecord: handleEditSection,
            deleteRecord: handleDeleteSection,
          },
          getAllTasksPerSection,
          onDragEnd,
        }),
        [sections, tasks, activeSectionId, taskFormData, sectionFormData, dialogStates],
      )}>
      {children}
    </ThemeContext.Provider>
  )
}

export { KanbanProvider, useKanbanContext }
