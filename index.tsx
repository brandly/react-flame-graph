import * as React from 'react'
import { render } from 'react-dom'
import styled from 'styled-components'
import { groupBy, last, initial, sum } from 'lodash'

interface PreStackFrame {
  stack: string[],
  count: number
}

interface StackFrame {
  name: string,
  count: number,
  children: StackFrame[]
}

function parse (input: string): PreStackFrame[] {
  return input.split('\n').map(line => {
    const splits = line.split(' ')
    return {
      stack: initial(splits).join(' ').split(';'),
      count: parseInt(last(splits), 10)
    }
  })
}

function nest (input: PreStackFrame[]): StackFrame[] {
  const data = groupBy(input, p => p.stack[0])
  return Object.keys(data).reduce((result, name) => {
    if (!name) return result

    data[name] = data[name].map(entry => {
      entry.stack = entry.stack.slice(1)
      return entry
    }).filter(entry => entry.stack.length)

    return result.concat({
      name,
      count: sum(data[name].map(d => d.count)),
      children: data[name].length ? nest(data[name]) : []
    })
  }, [])
}

interface DemoState {
  data: StackFrame[] | null,
  selected: StackFrame[] | null
}

class Demo extends React.Component<{}, DemoState> {
  constructor (props) {
    super(props)
    this.state = {
      data: null,
      selected: null
    }
  }

  componentDidMount () {
    fetch('collapsed-perf.txt')
      .then(res => res.text())
      .then(body => {
        this.setState({
          data: nest(parse(body))
        })
      })
  }

  render () {
    const { data, selected } = this.state
    return data ? (
      <div>
        {selected && <button onClick={() => {
          this.setState({ selected: null })
        }}>reset zoom</button>}
        <FlameGraph
          data={selected || data}
          onBarClick={(_, selected) => {
            this.setState({ selected })
          }}
        />
      </div>
    ) : <h1>Loading...</h1>
  }
}

const Flame = styled.div`
  width: 100%;
  position: relative;
  display: flex;
`

const Bar = styled.div`
  position: relative;
  overflow-x: hidden;
  height: 15px;
  border: 1px solid #666;
`

const Column = styled.div`
  display: flex;
  flex-direction: column;
`

const Label = styled.span`
  font-size: 10px;
  position: absolute;
  padding: 0 4px;
`

interface FlameGraphProps {
  data: StackFrame[],
  onBarClick: ((frame: StackFrame, siblings: StackFrame[]) => void)
}

class FlameGraph extends React.PureComponent<FlameGraphProps, {}> {
  render () {
    const { data, onBarClick } = this.props
    const total = sum(data.map(d => d.count))

    return <Flame>
      {data.map((d, i) =>
        <Column
          key={i}
          style={{
            width: (d.count / total) * 100 + '%'
          }}
        >
          <Bar key={i} title={d.name} onClick={() => onBarClick(d, data)}>
            {<Label>{d.name}</Label>}
          </Bar>
          <FlameGraph data={d.children} onBarClick={onBarClick} />
        </Column>
      )}
    </Flame>
  }
}

render(<Demo />, document.querySelector('#main'))
