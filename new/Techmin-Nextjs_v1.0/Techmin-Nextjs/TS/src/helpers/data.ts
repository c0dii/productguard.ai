import { invoicesData, referralsData } from '@/assets/data/apps'
import { activityData, contactListData, orders, orderStatus, pricingPlans, timelineData, users } from '@/assets/data/other'
import type { ActivityType, ContactType, InvoiceType, OrderStatusType, OrderType, PricingPlanType, ReferralType, TimelineType } from '@/types/data'
import { sleep } from '@/utils/promise'

export const getAllOrders = async (): Promise<OrderType[]> => {
  const data = orders.map((order) => {
    const user = users.find((user) => user.id === order.userId)
    return {
      ...order,
      user,
    }
  })
  await sleep()
  return data
}

export const getAllContacts = async (): Promise<ContactType[]> => {
  const data = contactListData.map((contact) => {
    const user = users.find((user) => user.id === contact.userId)
    return {
      ...contact,
      user,
    }
  })
  await sleep()
  return data
}

export const getAllInvoices = async (): Promise<InvoiceType[]> => {
  const data = invoicesData.map((invoice) => {
    const user = users.find((user) => user.id === invoice.userId)
    return {
      ...invoice,
      user,
    }
  })
  await sleep()
  return data
}

export const getInvoiceById = async (id: InvoiceType['id']): Promise<InvoiceType | undefined> => {
  const data = invoicesData.find((invoice) => invoice.id == id)
  await sleep()
  return data
}

export const getOrderStatus = async (): Promise<OrderStatusType[]> => {
  await sleep()
  return orderStatus
}

export const getReferralsData = async (): Promise<ReferralType[]> => {
  await sleep()
  return referralsData
}

export const getActivityData = async (): Promise<ActivityType[]> => {
  await sleep()
  return activityData
}

export const getTimelineData = async (): Promise<TimelineType> => {
  await sleep()
  return timelineData
}

export const getAllPricingPlans = async (): Promise<PricingPlanType[]> => {
  await sleep()
  return pricingPlans
}
