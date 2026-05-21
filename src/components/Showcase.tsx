import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { Checkbox } from "./ui/checkbox"
import { Switch } from "./ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { Badge } from "./ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Toggle } from "./ui/toggle"
import { Progress } from "./ui/progress"
import { Skeleton } from "./ui/skeleton"
import { Spinner } from "./ui/spinner"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "./ui/avatar"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { Separator } from "./ui/separator"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"
import { Slider } from "./ui/slider"
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion"
import {
  ResponsiveSheetContent,
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetTitle,
} from "./ui/responsive-sheet"
import {
  SheetTrigger,
} from "./ui/sheet"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./ui/navigation-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
} from "./ui/sidebar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Empty } from "./ui/empty"
import { Kbd } from "./ui/kbd"
import { Label } from "./ui/label"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "./ui/breadcrumb"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./ui/pagination"
import { ScrollArea } from "./ui/scroll-area"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./ui/resizable"
import {
  UserIcon,
  SettingsIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react"

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-16">
    <h2 className="text-2xl font-bold mb-6">{title}</h2>
    <div className="flex flex-wrap gap-6 items-start">{children}</div>
  </section>
)

const ComponentCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border rounded-lg p-4 min-w-[200px] flex-1">
    <h3 className="text-sm font-medium text-muted-foreground mb-3">{title}</h3>
    <div className="flex flex-wrap gap-2 items-center">{children}</div>
  </div>
)

const VariantRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-4 py-2 border-b last:border-0">
    <span className="text-sm text-muted-foreground w-24 shrink-0">{label}</span>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
)

export default function Showcase() {
  const [togglePressed, setTogglePressed] = useState(false)
  const [sliderValue, setSliderValue] = useState([50])
  const [selectValue, setSelectValue] = useState("")
  const [tabsValue, setTabsValue] = useState("account")
  const [checkboxChecked, setCheckboxChecked] = useState(false)
  const [radioValue, setRadioValue] = useState("option-1")

  const handleSelectChange = (value: string | null) => setSelectValue(value || "")
  const handleSliderChange = (value: number | readonly number[]) => setSliderValue(Array.isArray(value) ? value : [value])

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-4xl font-bold mb-8">Component Showcase</h1>

      <Section title="Buttons">
        <div className="w-full space-y-4">
          <VariantRow label="Variants">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </VariantRow>
          <VariantRow label="Sizes">
            <Button size="xs">XS</Button>
            <Button size="sm">SM</Button>
            <Button size="default">Default</Button>
            <Button size="lg">LG</Button>
          </VariantRow>
          <VariantRow label="Icon Sizes">
            <Button size="icon-xs"><SettingsIcon className="size-3" /></Button>
            <Button size="icon-sm"><SettingsIcon className="size-4" /></Button>
            <Button size="icon"><SettingsIcon className="size-4" /></Button>
            <Button size="icon-lg"><SettingsIcon className="size-5" /></Button>
          </VariantRow>
          <VariantRow label="With Icons">
            <Button><PlusIcon className="size-4 mr-2" /> Add</Button>
            <Button>Delete <TrashIcon className="size-4 ml-2" /></Button>
            <Button variant="secondary"><UserIcon className="size-4 mr-2" /> Profile</Button>
          </VariantRow>
        </div>
      </Section>

      <Section title="Form Elements">
        <div className="w-full space-y-4">
          <VariantRow label="Input">
            <Input placeholder="Default input" className="w-48" />
            <Input type="password" placeholder="Password" className="w-48" />
            <Input disabled placeholder="Disabled input" className="w-48" />
          </VariantRow>
          <VariantRow label="Textarea">
            <Textarea placeholder="Default textarea" className="w-64" />
            <Textarea disabled placeholder="Disabled textarea" className="w-64" />
          </VariantRow>
          <VariantRow label="Checkbox">
            <Checkbox checked={checkboxChecked} onCheckedChange={(c) => setCheckboxChecked(!!c)} />
            <Checkbox defaultChecked />
            <Checkbox disabled />
          </VariantRow>
          <VariantRow label="Switch">
            <Switch defaultChecked />
            <Switch />
            <Switch defaultChecked />
            <Switch />
          </VariantRow>
          <VariantRow label="Select">
            <Select value={selectValue} onValueChange={handleSelectChange}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Select option" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="option-1">Option 1</SelectItem>
                <SelectItem value="option-2">Option 2</SelectItem>
                <SelectItem value="option-3">Option 3</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectValue} onValueChange={handleSelectChange}>
              <SelectTrigger size="sm" className="w-40"><SelectValue placeholder="Small" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="option-1">Option 1</SelectItem>
                <SelectItem value="option-2">Option 2</SelectItem>
              </SelectContent>
            </Select>
          </VariantRow>
          <VariantRow label="Slider">
            <div className="w-64">
              <Slider value={sliderValue} onValueChange={handleSliderChange} max={100} step={1} />
            </div>
          </VariantRow>
          <VariantRow label="Radio Group">
            <RadioGroup value={radioValue} onValueChange={setRadioValue}>
              <div className="flex items-center gap-2"><RadioGroupItem value="option-1" /><Label>Option 1</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="option-2" /><Label>Option 2</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="option-3" /><Label>Option 3</Label></div>
            </RadioGroup>
          </VariantRow>
          <VariantRow label="Label & Kbd">
            <Label>Default Label</Label>
            <div className="flex gap-2"><Kbd>Cmd</Kbd><Kbd>Shift</Kbd><Kbd>+</Kbd><Kbd>C</Kbd></div>
          </VariantRow>
        </div>
      </Section>

      <Section title="Badges">
        <ComponentCard title="Variants">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
<Badge variant="outline">Ghost</Badge>
            <Badge variant="default">Link</Badge>
        </ComponentCard>
      </Section>

      <Section title="Cards">
        <div className="flex gap-6 flex-wrap">
          <Card className="w-[350px]">
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
              <CardDescription>Card description goes here.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">This is the card content area.</p>
            </CardContent>
            <CardFooter>
              <Button size="sm">Action</Button>
            </CardFooter>
          </Card>
          <Card className="w-[350px]">
            <CardHeader>
              <CardTitle>Small Card</CardTitle>
              <CardDescription>Compact version</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Smaller card content.</p>
            </CardContent>
            <CardFooter>
              <Button size="sm">Action</Button>
            </CardFooter>
          </Card>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs value={tabsValue} onValueChange={setTabsValue} className="w-[400px]">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="account">Account settings content.</TabsContent>
          <TabsContent value="password">Password settings content.</TabsContent>
          <TabsContent value="settings">Settings content.</TabsContent>
        </Tabs>
      </Section>

      <Section title="Toggle">
        <div className="w-full space-y-4">
          <VariantRow label="Variants">
            <Toggle pressed={togglePressed} onPressedChange={setTogglePressed}>Default</Toggle>
            <Toggle variant="outline" pressed={togglePressed} onPressedChange={setTogglePressed}>Outline</Toggle>
          </VariantRow>
          <VariantRow label="Sizes">
            <Toggle size="sm">Small</Toggle>
            <Toggle size="default">Default</Toggle>
            <Toggle size="lg">Large</Toggle>
          </VariantRow>
          <VariantRow label="Toggle Group">
            <ToggleGroup defaultValue={["bold", "italic"]}>
              <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
              <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
              <ToggleGroupItem value="underline">Underline</ToggleGroupItem>
            </ToggleGroup>
          </VariantRow>
        </div>
      </Section>

      <Section title="Progress & Skeleton">
        <div className="w-full space-y-6">
          <ComponentCard title="Progress">
            <div className="w-64 space-y-2">
              <Progress value={25} />
              <Progress value={50} />
              <Progress value={75} />
              <Progress value={100} />
            </div>
          </ComponentCard>
          <ComponentCard title="Skeleton">
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            </div>
          </ComponentCard>
          <ComponentCard title="Spinner">
            <Spinner />
            <Spinner className="size-6" />
            <Spinner className="size-8" />
          </ComponentCard>
        </div>
      </Section>

      <Section title="Avatar">
        <div className="w-full space-y-4">
          <VariantRow label="Sizes">
            <Avatar><AvatarImage src="https://i.pravatar.cc/100?img=1" /><AvatarFallback>SM</AvatarFallback></Avatar>
            <Avatar><AvatarImage src="https://i.pravatar.cc/100?img=2" /><AvatarFallback>JD</AvatarFallback></Avatar>
            <Avatar><AvatarImage src="https://i.pravatar.cc/100?img=3" /><AvatarFallback>LG</AvatarFallback></Avatar>
          </VariantRow>
          <ComponentCard title="Avatar Group">
            <div className="flex -space-x-4">
              <Avatar><AvatarImage src="https://i.pravatar.cc/100?img=1" /><AvatarFallback>1</AvatarFallback></Avatar>
              <Avatar><AvatarImage src="https://i.pravatar.cc/100?img=2" /><AvatarFallback>2</AvatarFallback></Avatar>
              <Avatar><AvatarImage src="https://i.pravatar.cc/100?img=3" /><AvatarFallback>3</AvatarFallback></Avatar>
              <Avatar className="bg-muted"><AvatarFallback>+5</AvatarFallback></Avatar>
            </div>
          </ComponentCard>
        </div>
      </Section>

      <Section title="Alert">
        <div className="w-[400px] space-y-4">
          <Alert>
            <AlertTitle>Default Alert</AlertTitle>
            <AlertDescription>This is a default alert message.</AlertDescription>
          </Alert>
          <Alert variant="info">
            <AlertTitle>Secondary Alert</AlertTitle>
            <AlertDescription>This is a secondary alert message.</AlertDescription>
          </Alert>
          <Alert variant="error">
            <AlertTitle>Destructive Alert</AlertTitle>
            <AlertDescription>This is a destructive alert message.</AlertDescription>
          </Alert>
          <Alert variant="success">
            <AlertTitle>Success Alert</AlertTitle>
            <AlertDescription>This is a success alert message.</AlertDescription>
          </Alert>
        </div>
      </Section>

      <Section title="Separator">
        <div className="w-[300px] space-y-4">
          <div>Content above</div>
          <Separator />
          <div>Content below</div>
          <Separator orientation="vertical" className="h-12" />
        </div>
      </Section>

      <Section title="Sheet">
        <Sheet>
          <SheetTrigger><Button>Open Sheet</Button></SheetTrigger>
          <ResponsiveSheetContent contentKey="showcase-form" defaultDesktopWidth={520}>
            <SheetHeader>
              <SheetTitle>Sheet Title</SheetTitle>
              <SheetDescription>This is a sheet description.</SheetDescription>
            </SheetHeader>
            <SheetPanel>
              <Input placeholder="Enter something" />
            </SheetPanel>
            <SheetFooter>
              <Button variant="outline">Cancel</Button>
              <Button>Confirm</Button>
            </SheetFooter>
          </ResponsiveSheetContent>
        </Sheet>
      </Section>

      <Section title="Confirmation Sheet">
        <Sheet>
          <SheetTrigger><Button variant="destructive">Delete Account</Button></SheetTrigger>
          <ResponsiveSheetContent contentKey="showcase-confirm" defaultDesktopWidth={480} maxDesktopWidth={640}>
            <SheetHeader>
              <SheetTitle>Are you sure?</SheetTitle>
              <SheetDescription>This action cannot be undone.</SheetDescription>
            </SheetHeader>
            <SheetFooter>
              <Button variant="outline">Cancel</Button>
              <Button variant="destructive">Delete</Button>
            </SheetFooter>
          </ResponsiveSheetContent>
        </Sheet>
      </Section>

      <Section title="Popover & Tooltip">
        <TooltipProvider>
          <div className="flex gap-6">
            <Popover>
              <PopoverTrigger><Button>Open Popover</Button></PopoverTrigger>
              <PopoverContent>
                <p className="text-sm font-medium mb-2">Popover Content</p>
                <p className="text-sm text-muted-foreground">This is popover content.</p>
              </PopoverContent>
            </Popover>
            <Tooltip>
              <TooltipTrigger><Button>Hover Me</Button></TooltipTrigger>
              <TooltipContent><p>This is a tooltip</p></TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </Section>

      <Section title="Table">
        <Table className="w-[500px]">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>John Doe</TableCell>
              <TableCell>john@example.com</TableCell>
              <TableCell>Admin</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Jane Smith</TableCell>
              <TableCell>jane@example.com</TableCell>
              <TableCell>User</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Section>

      <Section title="Empty">
        <Empty>No results found</Empty>
      </Section>

      <Section title="Breadcrumb">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/products">Products</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Current Page</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Section>

      <Section title="Pagination">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>2</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">3</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </Section>

      <Section title="Scroll Area">
        <ScrollArea className="h-[100px] w-[300px] rounded-md border p-4">
          <p className="text-sm">
            This is a scrollable area with lots of content that overflows the container.
            The scroll area provides a smooth scrolling experience with custom scrollbar styling.
          </p>
        </ScrollArea>
      </Section>

      <Section title="Resizable Panels">
        <ResizablePanelGroup className="w-[500px] h-[200px]">
          <ResizablePanel defaultSize={30}>
            <div className="flex h-full items-center justify-center p-4 bg-muted/50">
              <span>Panel 1</span>
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={70}>
            <div className="flex h-full items-center justify-center p-4">
              <span>Panel 2</span>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </Section>

      <Section title="Accordion">
        <div className="w-[400px]">
          <Accordion defaultValue={["item-1"]}>
            <AccordionItem value="item-1">
              <AccordionTrigger>Is it accessible?</AccordionTrigger>
              <AccordionContent>Yes. It uses Radix UI for accessibility.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Is it styled?</AccordionTrigger>
              <AccordionContent>Yes, it comes with default styles.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Is it animated?</AccordionTrigger>
              <AccordionContent>Yes, it has smooth animations.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </Section>

      <Section title="Sheet (Drawer)">
        <div className="flex gap-4">
          <Sheet>
            <SheetTrigger><Button>Open Sheet Right</Button></SheetTrigger>
            <ResponsiveSheetContent contentKey="right-sheet" defaultDesktopWidth={520}>
              <SheetHeader>
                <SheetTitle>Sheet Title</SheetTitle>
                <SheetDescription>This is a sheet description.</SheetDescription>
              </SheetHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground">Sheet content goes here.</p>
              </div>
            </ResponsiveSheetContent>
          </Sheet>
          <Sheet>
            <SheetTrigger><Button>Open Sheet Bottom</Button></SheetTrigger>
            <ResponsiveSheetContent contentKey="bottom-sheet" mobileSide="bottom" side="bottom" resizable={false}>
              <SheetHeader>
                <SheetTitle>Sheet from Bottom</SheetTitle>
              </SheetHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground">This sheet slides from the bottom.</p>
              </div>
            </ResponsiveSheetContent>
          </Sheet>
        </div>
      </Section>

      <Section title="Navigation Menu">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Getting Started</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="grid gap-3 p-4 w-[400px]">
                  <NavigationMenuLink>Introduction</NavigationMenuLink>
                  <NavigationMenuLink>Installation</NavigationMenuLink>
                  <NavigationMenuLink>Configuration</NavigationMenuLink>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Components</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="grid gap-3 p-4 w-[400px]">
                  <NavigationMenuLink>Button</NavigationMenuLink>
                  <NavigationMenuLink>Input</NavigationMenuLink>
                  <NavigationMenuLink>Select</NavigationMenuLink>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink>Documentation</NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </Section>

      <Section title="Sidebar">
        <div className="border rounded-lg overflow-hidden h-[300px] w-[500px]">
          <SidebarProvider defaultOpen>
            <div className="flex h-full">
              <Sidebar side="left" collapsible="none">
                <SidebarHeader>
                  <p className="text-sm font-medium px-2">Sidebar Header</p>
                </SidebarHeader>
                <SidebarSeparator />
                <SidebarContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton isActive>Dashboard</SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton>Settings</SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton>Profile</SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarContent>
                <SidebarFooter>
                  <p className="text-xs text-muted-foreground px-2">v1.0.0</p>
                </SidebarFooter>
              </Sidebar>
              <div className="flex-1 p-4">
                <p className="text-sm text-muted-foreground">Main content area</p>
              </div>
            </div>
          </SidebarProvider>
        </div>
      </Section>
    </div>
  )
}
