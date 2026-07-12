import { motion } from "framer-motion"
import {
  BadgeCheckIcon,
  BanknoteIcon,
  CalendarIcon,
  IdCardIcon,
  LinkIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldIcon,
  UserCogIcon,
  UserIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useDrawerHistory } from "@/hooks/use-drawer-history"
import { useIsMobile } from "@/hooks/use-media-query"

import type { ManagedUser } from "./utils"
import { canLinkAuthAccount, canManageUser, displayPersonName, formatDate, getRoleLabel, initials, normalizeRole } from "./utils"

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.25 } },
}

export function UserDetailDrawer({
  user,
  currentUser,
  onOpenChange,
  onEdit,
  onLinkAuth,
  children,
}: {
  user: ManagedUser | null
  currentUser: { id: string; role?: string; isOwner?: boolean } | null
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  onLinkAuth: () => void
  children?: React.ReactNode
}) {
  const isMobile = useIsMobile()
  const isOpen = Boolean(user)
  const editable = currentUser && user ? canManageUser(currentUser, user) : false
  const linkable = currentUser && user ? canLinkAuthAccount(currentUser, user) : false

  useDrawerHistory(isOpen, onOpenChange)

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange} position={isMobile ? "bottom" : "right"}>
      <DrawerPopup
        showCloseButton={!isMobile}
        className={isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : ""}
        style={!isMobile ? { width: 620, maxWidth: "min(840px, calc(100vw - 2rem))", minWidth: 460 } : undefined}
      >
        {user && (
          <>
            <DrawerHeader>
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  <AvatarImage src={user.avatarUrl ?? user.avatar ?? undefined} />
                  <AvatarFallback>{initials(user)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <DrawerTitle className="truncate text-lg font-semibold">
                    {displayPersonName(user)}
                  </DrawerTitle>
                  <DrawerDescription className="truncate font-mono text-xs">
                    {user.publicCode || user.id}
                  </DrawerDescription>
                </div>
              </div>
            </DrawerHeader>

            <DrawerPanel>
              <motion.div
                className="flex flex-col gap-6"
                variants={{ animate: { transition: { staggerChildren: 0.06 } } }}
                initial="initial"
                animate="animate"
                key={user.id}
              >
                <motion.div variants={fadeIn}>
                  <SectionBlock>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Datos personales</h3>
                    <div className="flex flex-col gap-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <InfoRow
                          icon={<MailIcon className="size-5" />}
                          label="Correo"
                          value={user.email || "Sin correo"}
                        />
                        <InfoRow
                          icon={<PhoneIcon className="size-5" />}
                          label="Teléfono"
                          value={user.phone || "Sin teléfono"}
                        />
                        <InfoRow
                          icon={<IdCardIcon className="size-5" />}
                          label="DNI"
                          value={user.dni || "Sin documento"}
                        />
                        <InfoRow
                          icon={<UserIcon className="size-5" />}
                          label="Estado civil"
                          value={user.maritalStatus || "No especificado"}
                        />
                      </div>
                      <InfoRow
                        icon={<MapPinIcon className="size-5" />}
                        label="Dirección"
                        value={user.address || "Sin dirección"}
                      />
                    </div>
                  </SectionBlock>
                </motion.div>

                <motion.div variants={fadeIn}>
                  <SectionBlock>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Información bancaria</h3>
                    <div className="flex flex-col gap-4">
                      <InfoRow
                        icon={<BanknoteIcon className="size-5" />}
                        label="Banco"
                        value={user.bank || "Sin banco"}
                      />
                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs text-muted-foreground">Cuentas</p>
                        {user.bankAccounts && user.bankAccounts.filter(Boolean).length > 0 ? (
                          <div className="grid gap-1 sm:grid-cols-2">
                            {user.bankAccounts.filter(Boolean).map((account, index) => (
                              <span key={`${account}-${index}`} className="rounded-lg bg-muted/50 px-3 py-1.5 font-mono text-sm font-medium">
                                {account}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Sin cuentas registradas</p>
                        )}
                      </div>
                    </div>
                  </SectionBlock>
                </motion.div>

                <motion.div variants={fadeIn}>
                  <SectionBlock>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Cuenta de acceso</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <InfoRow
                        icon={user.authUserId ? <BadgeCheckIcon className="size-5" /> : <UserCogIcon className="size-5" />}
                        label="Estado"
                        value={user.authUserId ? "Con acceso" : "Sin acceso"}
                      />
                      <InfoRow
                        icon={<CalendarIcon className="size-5" />}
                        label="Registro"
                        value={formatDate(user.createdAt) || "Sin fecha"}
                      />
                    </div>
                  </SectionBlock>
                </motion.div>

                <motion.div variants={fadeIn}>
                  <SectionBlock>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Rol y estado</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <InfoRow
                        icon={<ShieldIcon className="size-5" />}
                        label="Rol"
                        value={getRoleLabel(normalizeRole(user.role))}
                      />
                      <InfoRow
                        icon={user.active !== false ? <BadgeCheckIcon className="size-5" /> : <UserCogIcon className="size-5" />}
                        label="Estado"
                        value={user.active !== false ? "Activo" : "Inactivo"}
                      />
                    </div>
                  </SectionBlock>
                </motion.div>
              </motion.div>
            </DrawerPanel>

            <DrawerFooter variant="bare">
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  {editable && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={onEdit}
                    >
                      <UserCogIcon data-icon="inline-start" />
                      Editar
                    </Button>
                  )}
                  {linkable && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={onLinkAuth}
                    >
                      <LinkIcon data-icon="inline-start" />
                      Vincular acceso
                    </Button>
                  )}
                </div>
                <DrawerClose render={<Button variant="secondary" />}>
                  Cerrar
                </DrawerClose>
              </div>
            </DrawerFooter>
          </>
        )}
      </DrawerPopup>

      {children}
    </Drawer>
  )
}

function SectionBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-muted/30 p-4">
      {children}
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`truncate text-sm font-semibold ${mono ? "font-mono" : ""}`}>
          {value}
        </p>
      </div>
    </div>
  )
}
