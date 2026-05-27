import { Suspense } from "react"
import DashboardWrapperClient from './dashboard-wrapper-client'

export default async function DashboardPage() {
	return (
		<Suspense>
			<DashboardWrapperClient />
		</Suspense>
	)
}
