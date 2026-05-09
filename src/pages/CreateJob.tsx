import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { createJobProfile } from '@/db/hooks'

export function CreateJob() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [jdText, setJdText] = useState('')
  const [seniority, setSeniority] = useState('mid')
  const [minYears, setMinYears] = useState('3')
  const [maxYears, setMaxYears] = useState('')
  const [mustHaveInput, setMustHaveInput] = useState('')
  const [mustHaveSkills, setMustHaveSkills] = useState<string[]>([])
  const [niceToHaveInput, setNiceToHaveInput] = useState('')
  const [niceToHaveSkills, setNiceToHaveSkills] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const handleAddMustHave = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && mustHaveInput.trim()) {
      e.preventDefault()
      const skill = mustHaveInput.trim().toLowerCase()
      if (!mustHaveSkills.includes(skill)) {
        setMustHaveSkills([...mustHaveSkills, skill])
      }
      setMustHaveInput('')
    }
  }

  const handleAddNiceToHave = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && niceToHaveInput.trim()) {
      e.preventDefault()
      const skill = niceToHaveInput.trim().toLowerCase()
      if (!niceToHaveSkills.includes(skill)) {
        setNiceToHaveSkills([...niceToHaveSkills, skill])
      }
      setNiceToHaveInput('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !jdText.trim()) return

    setSaving(true)
    try {
      const id = await createJobProfile({
        title: title.trim(),
        location: location.trim(),
        locationCoords: null,
        jdText: jdText.trim(),
        mustHaveSkills,
        niceToHaveSkills,
        minYearsExperience: parseInt(minYears) || 0,
        maxYearsExperience: maxYears ? parseInt(maxYears) : null,
        seniority
      })
      navigate(`/jobs/${id}`)
    } catch (error) {
      console.error('Failed to create job:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold">Create Job Profile</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Senior Backend Engineer"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Bangalore, India"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seniority">Seniority</Label>
                <Select value={seniority} onValueChange={setSeniority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intern">Intern</SelectItem>
                    <SelectItem value="junior">Junior</SelectItem>
                    <SelectItem value="mid">Mid-level</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="principal">Principal</SelectItem>
                    <SelectItem value="director">Director</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="minYears">Min Years Experience</Label>
                <Input
                  id="minYears"
                  type="number"
                  min="0"
                  value={minYears}
                  onChange={e => setMinYears(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxYears">Max Years (optional)</Label>
                <Input
                  id="maxYears"
                  type="number"
                  min="0"
                  value={maxYears}
                  onChange={e => setMaxYears(e.target.value)}
                  placeholder="No limit"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job Description</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              placeholder="Paste the full job description here..."
              className="min-h-[200px]"
              required
            />
            <p className="text-xs text-muted-foreground mt-2">
              {jdText.length} characters
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Must-have Skills (press Enter to add)</Label>
              <Input
                value={mustHaveInput}
                onChange={e => setMustHaveInput(e.target.value)}
                onKeyDown={handleAddMustHave}
                placeholder="e.g., react, node.js, typescript"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {mustHaveSkills.map(skill => (
                  <Badge key={skill} variant="default" className="gap-1">
                    {skill}
                    <button
                      type="button"
                      onClick={() => setMustHaveSkills(mustHaveSkills.filter(s => s !== skill))}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nice-to-have Skills (press Enter to add)</Label>
              <Input
                value={niceToHaveInput}
                onChange={e => setNiceToHaveInput(e.target.value)}
                onKeyDown={handleAddNiceToHave}
                placeholder="e.g., graphql, docker, aws"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {niceToHaveSkills.map(skill => (
                  <Badge key={skill} variant="secondary" className="gap-1">
                    {skill}
                    <button
                      type="button"
                      onClick={() => setNiceToHaveSkills(niceToHaveSkills.filter(s => s !== skill))}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={!title.trim() || !jdText.trim() || saving}>
            {saving ? 'Creating...' : 'Create Job Profile'}
          </Button>
        </div>
      </form>
    </div>
  )
}
